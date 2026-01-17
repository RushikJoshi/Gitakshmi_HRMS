const mongoose = require('mongoose');
const PayrollCalculator = require('../services/PayrollCalculator');

/**
 * ============================================
 * SALARY CONTROLLER - REFACTORED
 * ============================================
 * 
 * CORE PRINCIPLES:
 * 1. HR enters ONLY CTC
 * 2. Backend calculates EVERYTHING
 * 3. Frontend NEVER calculates
 * 4. Snapshots are IMMUTABLE once locked
 */

const SalaryController = {
    /**
     * Preview salary breakdown WITHOUT saving
     * POST /api/salary/preview
     * Body: { ctcAnnual, components (optional) }
     */
    preview: async (req, res) => {
        try {
            const { ctcAnnual, components } = req.body;

            if (!ctcAnnual || isNaN(ctcAnnual) || ctcAnnual <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid Annual CTC is required"
                });
            }

            // Calculate using PayrollCalculator
            const breakdown = PayrollCalculator.calculateSalaryBreakup({
                annualCTC: Number(ctcAnnual),
                components: components || {}
            });

            // Validate the breakdown
            const validation = PayrollCalculator.validateSnapshot(breakdown);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: "Salary calculation validation failed",
                    errors: validation.errors
                });
            }

            res.json({
                success: true,
                data: breakdown,
                message: "Salary breakdown calculated successfully"
            });

        } catch (error) {
            console.error("[SALARY_PREVIEW] Error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Assign salary to Employee or Applicant
     * POST /api/salary/assign
     * Body: { employeeId OR applicantId, ctcAnnual, components (optional), effectiveDate (optional) }
     */
    assign: async (req, res) => {
        try {
            const { employeeId, applicantId, ctcAnnual, components, effectiveDate } = req.body;
            const tenantDB = req.tenantDB;

            // Validation
            if (!employeeId && !applicantId) {
                return res.status(400).json({
                    success: false,
                    message: "Either employeeId or applicantId is required"
                });
            }

            if (!ctcAnnual || isNaN(ctcAnnual) || ctcAnnual <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid Annual CTC is required"
                });
            }

            // Calculate salary breakdown
            const breakdown = PayrollCalculator.calculateSalaryBreakup({
                annualCTC: Number(ctcAnnual),
                components: components || {}
            });

            // Validate
            const validation = PayrollCalculator.validateSnapshot(breakdown);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: "Salary calculation validation failed",
                    errors: validation.errors
                });
            }

            // Create Salary Snapshot (UNLOCKED - can be modified)
            const EmployeeSalarySnapshot = tenantDB.model('EmployeeSalarySnapshot');

            const snapshot = await EmployeeSalarySnapshot.create({
                employee: employeeId || null,
                applicant: applicantId || null,
                tenant: req.user.tenantId,
                ctc: breakdown.annualCTC,
                monthlyCTC: breakdown.monthlyCTC,
                earnings: breakdown.earnings,
                employeeDeductions: breakdown.employeeDeductions,
                benefits: breakdown.benefits,
                breakdown: breakdown.breakdown,
                effectiveFrom: effectiveDate ? new Date(effectiveDate) : new Date(),
                locked: false, // NOT locked yet - can be modified
                createdBy: req.user.id,
                reason: 'ASSIGNMENT'
            });

            // Update Employee/Applicant record
            if (employeeId) {
                const Employee = tenantDB.model('Employee');
                await Employee.findByIdAndUpdate(employeeId, {
                    $set: {
                        salaryAssigned: true,
                        salaryLocked: false,
                        currentSnapshotId: snapshot._id,
                        salarySnapshotId: snapshot._id
                    }
                });
            }

            if (applicantId) {
                const Applicant = tenantDB.model('Applicant');
                await Applicant.findByIdAndUpdate(applicantId, {
                    $set: {
                        salaryAssigned: true,
                        salaryLocked: false,
                        salarySnapshotId: snapshot._id,
                        salarySnapshot: {
                            ctc: breakdown.annualCTC,
                            monthlyCTC: breakdown.monthlyCTC,
                            earnings: breakdown.earnings,
                            employeeDeductions: breakdown.employeeDeductions,
                            benefits: breakdown.benefits,
                            breakdown: breakdown.breakdown
                        }
                    }
                });
            }

            res.status(201).json({
                success: true,
                message: "Salary assigned successfully. Call /confirm to lock it.",
                data: {
                    snapshot: snapshot,
                    breakdown: breakdown
                }
            });

        } catch (error) {
            console.error("[SALARY_ASSIGN] Error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Confirm and LOCK salary snapshot
     * POST /api/salary/confirm
     * Body: { employeeId OR applicantId, snapshotId (optional) }
     */
    confirm: async (req, res) => {
        try {
            const { employeeId, applicantId, snapshotId, reason } = req.body;
            const tenantDB = req.tenantDB;

            if (!employeeId && !applicantId) {
                return res.status(400).json({
                    success: false,
                    message: "Either employeeId or applicantId is required"
                });
            }

            const EmployeeSalarySnapshot = tenantDB.model('EmployeeSalarySnapshot');

            // Find the snapshot to lock
            let snapshot;
            if (snapshotId) {
                snapshot = await EmployeeSalarySnapshot.findById(snapshotId);
            } else {
                // Find the most recent unlocked snapshot
                const query = employeeId
                    ? { employee: employeeId, locked: false }
                    : { applicant: applicantId, locked: false };

                snapshot = await EmployeeSalarySnapshot.findOne(query).sort({ createdAt: -1 });
            }

            if (!snapshot) {
                return res.status(404).json({
                    success: false,
                    message: "No unlocked salary snapshot found. Assign salary first."
                });
            }

            // LOCK the snapshot
            snapshot.locked = true;
            snapshot.lockedAt = new Date();
            snapshot.lockedBy = req.user.id;
            snapshot.reason = reason || snapshot.reason || 'CONFIRMED';
            await snapshot.save();

            // Update Employee/Applicant - mark as LOCKED
            if (employeeId) {
                const Employee = tenantDB.model('Employee');
                await Employee.findByIdAndUpdate(employeeId, {
                    $set: {
                        salaryLocked: true,
                        currentSnapshotId: snapshot._id
                    },
                    $addToSet: { salarySnapshots: snapshot._id }
                });
            }

            if (applicantId) {
                const Applicant = tenantDB.model('Applicant');
                await Applicant.findByIdAndUpdate(applicantId, {
                    $set: {
                        salaryLocked: true,
                        salarySnapshotId: snapshot._id
                    }
                });
            }

            res.json({
                success: true,
                message: "Salary confirmed and locked successfully. Snapshot is now immutable.",
                data: snapshot
            });

        } catch (error) {
            console.error("[SALARY_CONFIRM] Error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Get salary snapshot for an employee/applicant
     * GET /api/salary/snapshot/:id
     */
    getSnapshot: async (req, res) => {
        try {
            const { id } = req.params;
            const { type } = req.query; // 'employee' or 'applicant'
            const tenantDB = req.tenantDB;

            const EmployeeSalarySnapshot = tenantDB.model('EmployeeSalarySnapshot');

            const query = type === 'applicant'
                ? { applicant: id, locked: true }
                : { employee: id, locked: true };

            const snapshot = await EmployeeSalarySnapshot.findOne(query).sort({ effectiveFrom: -1 });

            if (!snapshot) {
                return res.status(404).json({
                    success: false,
                    message: "No salary snapshot found"
                });
            }

            res.json({
                success: true,
                data: snapshot
            });

        } catch (error) {
            console.error("[GET_SNAPSHOT] Error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = SalaryController;
