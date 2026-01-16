const mongoose = require('mongoose');
const SalaryEngine = require('../services/salaryEngine');

/**
 * Controller for Salary Operations (Immutability Focused)
 */
const SalaryController = {
    /**
     * Preview a salary breakup without saving anything
     * GET /api/salary/preview
     */
    preview: async (req, res) => {
        try {
            // Support both GET (query) and POST (body)
            const params = { ...req.query, ...req.body };
            const { templateId, ctcAnnual, additionalComponents } = params;
            const tenantDB = req.tenantDB;

            if (!templateId || !ctcAnnual) {
                return res.status(400).json({ success: false, message: "templateId and ctcAnnual are required" });
            }

            const SalaryTemplate = tenantDB.model('SalaryTemplate');
            const template = await SalaryTemplate.findById(templateId).lean(); // Use lean to allow modification

            if (!template) {
                return res.status(404).json({ success: false, message: "Template not found" });
            }

            // Calculation only - no DB write
            const resolved = await SalaryEngine.calculate({
                annualCTC: Number(ctcAnnual),
                template,
                additionalComponents: additionalComponents || []
            });

            res.json({
                success: true,
                data: resolved
            });

        } catch (error) {
            console.error("[SALARY_PREVIEW] Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Assign salary to an employee (Creates/Updates DRAFT SalaryAssignment)
     * POST /api/salary/assign
     */
    assign: async (req, res) => {
        try {
            let { employeeId, applicantId, templateId, ctcAnnual, effectiveDate, additionalComponents } = req.body;
            const tenantDB = req.tenantDB;

            if (!templateId || !ctcAnnual) {
                return res.status(400).json({ success: false, message: "templateId and ctcAnnual are required" });
            }

            const SalaryTemplate = tenantDB.model('SalaryTemplate');
            const template = await SalaryTemplate.findById(templateId).lean();

            if (!template) {
                return res.status(404).json({ success: false, message: "Template not found" });
            }

            // AUTO-DETECTION: If only one ID is provided, check which model it belongs to
            if (employeeId && !applicantId) {
                const Applicant = tenantDB.model('Applicant');
                const isActuallyApplicant = await Applicant.findById(employeeId).select('_id').lean();
                if (isActuallyApplicant) {
                    applicantId = employeeId;
                    employeeId = null;
                }
            } else if (!employeeId && applicantId) {
                const Employee = tenantDB.model('Employee');
                const isActuallyEmployee = await Employee.findById(applicantId).select('_id').lean();
                if (isActuallyEmployee) {
                    employeeId = applicantId;
                    applicantId = null;
                }
            }

            // 1. Calculate the breakdown for the assignment record
            const calculated = await SalaryEngine.calculate({
                annualCTC: Number(ctcAnnual),
                template,
                additionalComponents: additionalComponents || []
            });

            const SalaryAssignment = tenantDB.model('SalaryAssignment');

            // 2. Clear old "Current" assignments if this is a new assignment
            if (employeeId) {
                await SalaryAssignment.updateMany({ employeeId, isCurrent: true }, { isCurrent: false });
            }

            // 3. Create/Update SalaryAssignment Record (The DRAFT structure)
            const assignment = await SalaryAssignment.create({
                tenantId: req.tenantId,
                employeeId: employeeId || null,
                applicantId: applicantId || null,
                salaryTemplateId: templateId,
                ctcAnnual: Number(ctcAnnual),
                monthlyCTC: calculated.monthlyCTC,
                earnings: calculated.earnings,
                deductions: calculated.employeeDeductions,
                benefits: calculated.benefits,
                netSalaryMonthly: calculated.totals.netMonthly,
                effectiveFrom: effectiveDate || new Date(),
                isConfirmed: false,
                isCurrent: true,
                assignedBy: req.user.id
            });

            // 4. Update Employee to mark salary as ASSIGNED (but not yet locked)
            if (employeeId) {
                const Employee = tenantDB.model('Employee');
                await Employee.findByIdAndUpdate(employeeId, {
                    $set: {
                        salaryAssigned: true,
                        salaryLocked: false, // Ensure it's unlocked if we just assigned/re-assigned
                        salaryTemplateId: templateId // Keep legacy sync for UI
                    }
                });
            }

            if (applicantId) {
                await tenantDB.model('Applicant').findByIdAndUpdate(applicantId, {
                    $set: {
                        salaryAssigned: true,
                        salaryLocked: false
                    }
                });
            }

            res.status(201).json({
                success: true,
                message: "Salary assigned successfully. Please CONFIRM to lock and generate letters.",
                data: assignment
            });

        } catch (error) {
            console.error("[SALARY_ASSIGN] Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Confirm salary and create IMMUTABLE snapshot (LOCKED)
     * POST /api/salary/confirm
     */
    confirm: async (req, res) => {
        try {
            const { employeeId, applicantId, assignmentId, reason } = req.body;
            const tenantDB = req.tenantDB;

            const SalaryAssignment = tenantDB.model('SalaryAssignment');
            const Employee = tenantDB.model('Employee');
            const EmployeeSalarySnapshot = tenantDB.model('EmployeeSalarySnapshot');
            const SalaryTemplate = tenantDB.model('SalaryTemplate');

            let targetId = employeeId || applicantId;
            let query = assignmentId ? { _id: assignmentId } : { employeeId: targetId, isCurrent: true };

            const assignment = await SalaryAssignment.findOne(query);

            if (!assignment) {
                return res.status(404).json({ success: false, message: "Active salary assignment not found. Assign salary first." });
            }

            // AUTO-HEALING: If assignment is missing core CTC data (Legacy record)
            // Or if it was created without the full breakup
            if (!assignment.ctcAnnual || !assignment.earnings || assignment.earnings.length === 0) {
                console.log(`[SALARY_CONFIRM] Detected legacy/incomplete assignment ${assignment._id}. Attempting auto-healing...`);

                const template = await SalaryTemplate.findById(assignment.salaryTemplateId).lean();
                if (!template) {
                    return res.status(400).json({ success: false, message: "Cannot confirm: Original template not found and assignment data is incomplete." });
                }

                // Fallback to template CTC if assignment is missing it
                const ctcToUse = assignment.ctcAnnual || assignment.assignmentSnapshot?.annualCTC || template.annualCTC;

                if (!ctcToUse) {
                    return res.status(400).json({ success: false, message: "Cannot confirm: Assignment and Template are missing CTC value." });
                }

                const calculated = await SalaryEngine.calculate({
                    annualCTC: Number(ctcToUse),
                    template
                });

                // Update assignment in-memory (and save it too for future references)
                assignment.ctcAnnual = calculated.annualCTC;
                assignment.monthlyCTC = calculated.monthlyCTC;
                assignment.earnings = calculated.earnings;
                assignment.deductions = calculated.employeeDeductions;
                assignment.benefits = calculated.benefits;
                assignment.netSalaryMonthly = calculated.totals.netMonthly;
                await assignment.save();
                console.log(`[SALARY_CONFIRM] Auto-healed assignment ${assignment._id}`);
            }

            // 1. Fetch the target to get the previous snapshot
            const target = employeeId ? await Employee.findById(employeeId) : await tenantDB.model('Applicant').findById(applicantId);
            const prevSnapshotId = target?.currentSnapshotId || target?.currentSalarySnapshotId || null;

            // 2. Create the IMMUTABLE EmployeeSalarySnapshot
            // Wrap in try-catch to provide better error messages if validation fails
            let snapshot;
            try {
                snapshot = await EmployeeSalarySnapshot.create({
                    employee: employeeId,
                    applicant: applicantId,
                    tenant: req.tenantId,
                    templateId: assignment.salaryTemplateId,
                    ctc: assignment.ctcAnnual,
                    monthlyCTC: assignment.monthlyCTC || Math.round((assignment.ctcAnnual / 12) * 100) / 100,
                    earnings: assignment.earnings,
                    employeeDeductions: assignment.deductions,
                    benefits: assignment.benefits,
                    breakdown: {
                        takeHome: assignment.netSalaryMonthly,
                        grossA: assignment.earnings?.reduce((sum, e) => sum + e.monthlyAmount, 0) || 0
                    },
                    effectiveFrom: assignment.effectiveFrom,
                    locked: true, // AUTO-LOCK on confirmation
                    lockedAt: new Date(),
                    lockedBy: req.user.id,
                    reason: reason || 'JOINING',
                    previousSnapshotId: prevSnapshotId,
                    createdBy: req.user.id
                });
            } catch (snapError) {
                console.error("[SALARY_CONFIRM] Snapshot Validation Failed:", snapError);
                return res.status(400).json({
                    success: false,
                    message: "Salary snapshot creation failed. Please check if all salary components have valid values.",
                    details: snapError.message
                });
            }

            // 3. Mark Assignment as Confirmed
            assignment.isConfirmed = true;
            await assignment.save();

            // 4. Update Employee - LOCK SALARY
            if (employeeId) {
                await Employee.findByIdAndUpdate(employeeId, {
                    $set: {
                        salaryAssigned: true,
                        salaryLocked: true,
                        currentSnapshotId: snapshot._id,
                        currentSalarySnapshotId: snapshot._id, // Unified
                        salarySnapshotId: snapshot._id // Legacy
                    },
                    $push: { salarySnapshots: snapshot._id }
                });
            }

            // Update Applicant
            if (applicantId) {
                await tenantDB.model('Applicant').findByIdAndUpdate(applicantId, {
                    $set: {
                        salaryAssigned: true,
                        salaryLocked: true,
                        salarySnapshotId: snapshot._id
                    }
                });
            }

            res.json({
                success: true,
                message: "Salary confirmed and locked successfully.",
                data: snapshot
            });

        } catch (error) {
            console.error("[SALARY_CONFIRM] Unexpected Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = SalaryController;
