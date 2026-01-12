const mongoose = require('mongoose');
const payrollService = require('../services/payroll.service');

// Helper to get models
const getModels = (req) => {
    return {
        Employee: req.tenantDB.model('Employee'),
        SalaryTemplate: req.tenantDB.model('SalaryTemplate'),
        Attendance: req.tenantDB.model('Attendance'),
        PayrollRun: req.tenantDB.model('PayrollRun'),
        PayrollRunItem: req.tenantDB.model('PayrollRunItem'),
        SalaryAssignment: req.tenantDB.model('SalaryAssignment')
    };
};

/**
 * GET /api/payroll/process/employees?month=YYYY-MM
 * Fetch employees with their status for the payroll month
 */
exports.getProcessEmployees = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ success: false, message: "Month is required" });

        const [year, monthNum] = month.split('-');
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        const { Employee, SalaryAssignment, Attendance, SalaryTemplate } = getModels(req);

        // Fetch Active Employees
        const employees = await Employee.find({
            status: 'Active',
            joiningDate: { $lte: endDate }
        }).select('firstName lastName employeeId department role email joiningDate');

        // Fetch Assignments for all employees to determine current template
        // We use the same logic as service: latest assignment <= endDate
        const employeeData = await Promise.all(employees.map(async (emp) => {
            const assignment = await SalaryAssignment.findOne({
                employeeId: emp._id,
                effectiveFrom: { $lte: endDate }
            }).sort({ effectiveFrom: -1 });

            let templateId = null;
            if (assignment && (!assignment.effectiveTo || new Date(assignment.effectiveTo) >= startDate)) {
                templateId = assignment.salaryTemplateId;
            }

            // Simple Attendance Count (Optimization: could use aggregate for bulk)
            const attendanceCount = await Attendance.countDocuments({
                employee: emp._id,
                date: { $gte: startDate, $lte: endDate },
                status: { $in: ['present', 'half_day', 'work_from_home'] }
            });

            return {
                _id: emp._id,
                name: `${emp.firstName} ${emp.lastName}`,
                department: emp.department,
                salaryTemplateId: templateId,
                attendanceParams: {
                    presentDays: attendanceCount, // Simplified for UI preview
                    totalDays: endDate.getDate()
                }
            };
        }));

        res.json({ success: true, data: employeeData });

    } catch (error) {
        console.error("Get Process Employees Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/payroll/process/preview
 * Calculate partial payroll for selected employees
 * Body: { month: "YYYY-MM", items: [{ employeeId, salaryTemplateId }] }
 */
exports.previewPreview = async (req, res) => {
    try {
        const { month, items } = req.body;
        const [year, monthNum] = month.split('-');
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        const { Employee, SalaryTemplate, PayrollRun } = getModels(req);

        const results = [];

        for (const item of items) {
            const emp = await Employee.findById(item.employeeId);
            if (!emp) continue;

            try {
                // Call Service with DRY RUN
                const result = await payrollService.calculateEmployeePayroll(
                    req.tenantDB,
                    req.user.tenantId,
                    emp,
                    parseInt(monthNum),
                    parseInt(year),
                    startDate,
                    endDate,
                    endDate.getDate(),
                    new Set(), // Empty holidays for preview
                    null, // No payrollRunId
                    item.salaryTemplateId,
                    true // dryRun = true
                );

                results.push({
                    employeeId: emp._id,
                    gross: result.grossEarnings,
                    net: result.netPay,
                    breakdown: result
                });

            } catch (err) {
                results.push({
                    employeeId: emp._id,
                    error: err.message
                });
            }
        }

        res.json({ success: true, data: results });

    } catch (error) {
        console.error("Preview Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/payroll/process/run
 * Execute Payroll Run with Strict Validation and Skipping Disabled Items
 * Body: { month: "YYYY-MM", items: [{ employeeId, salaryTemplateId }] }
 */
exports.runPayroll = async (req, res) => {
    try {
        const { month, items } = req.body;
        console.log(`🚀 [RUN_PAYROLL] Month: ${month}, Items: ${items?.length}`);
        const [year, monthNum] = month.split('-');

        const { PayrollRun, Employee, PayrollRunItem, SalaryAssignment } = getModels(req);

        // 1. Check duplicate run
        let payrollRun = await PayrollRun.findOne({ month: parseInt(monthNum), year: parseInt(year) });

        if (payrollRun) {
            if (['APPROVED', 'PAID'].includes(payrollRun.status)) {
                return res.status(400).json({ success: false, message: "Payroll for this month is already approved or paid" });
            }
            // If exists but not finalized, we reset it
            console.log(`♻️ [RUN_PAYROLL] Resetting existing run: ${payrollRun._id}`);
            payrollRun.status = 'INITIATED';
            payrollRun.initiatedBy = req.user.id || req.user._id;
            payrollRun.totalEmployees = items.length;
            payrollRun.processedEmployees = 0;
            payrollRun.failedEmployees = 0;
            payrollRun.totalGross = 0;
            payrollRun.totalNetPay = 0;
            payrollRun.executionErrors = [];
            // Delete existing items for this run to start fresh
            await PayrollRunItem.deleteMany({ payrollRunId: payrollRun._id });
        } else {
            // 2. Create Payroll Run Holder
            payrollRun = new PayrollRun({
                tenantId: req.user.tenantId,
                month: parseInt(monthNum),
                year: parseInt(year),
                status: 'INITIATED',
                initiatedBy: req.user.id || req.user._id,
                totalEmployees: items.length,
                processedEmployees: 0
            });
        }
        await payrollRun.save();

        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        let successCount = 0;
        let failCount = 0;
        let totalGross = 0;
        let totalNet = 0;

        const skippedList = [];
        const processedList = [];

        // 3. Process Items
        for (const item of items) {
            // Basic Validation
            if (!item.employeeId) continue;

            // Validation 1: Missing Template
            if (!item.salaryTemplateId) {
                skippedList.push({
                    employeeId: item.employeeId,
                    reason: "SALARY_TEMPLATE_MISSING"
                });
                continue; // Skip this employee
            }

            try {
                const emp = await Employee.findById(item.employeeId);
                if (!emp) {
                    skippedList.push({ employeeId: item.employeeId, reason: "EMPLOYEE_NOT_FOUND" });
                    continue;
                }

                console.log(`🔍 [RUN_PAYROLL] Processing emp: ${emp._id}`);
                // Call Service to calculate and save payslip
                const payslip = await payrollService.calculateEmployeePayroll(
                    req.tenantDB,
                    req.user.tenantId,
                    emp,
                    parseInt(monthNum),
                    parseInt(year),
                    startDate,
                    endDate,
                    endDate.getDate(),
                    new Set(), // No holidays for simple run
                    payrollRun._id,
                    item.salaryTemplateId,
                    false // dryRun = false (SAVE the payslip)
                );

                console.log(`📊 [RUN_PAYROLL] Attendance for ${emp.firstName}: Present ${payslip.attendanceSummary?.presentDays}, Holidays ${payslip.attendanceSummary?.holidayDays}`);

                // Validation 2: Zero Payable Days
                // Payable = presentDays + holidayDays + (leaveDays if paid)
                const { presentDays = 0, holidayDays = 0, leaveDays = 0 } = payslip.attendanceSummary || {};
                const payableDays = (presentDays || 0) + (holidayDays || 0) + (leaveDays || 0);

                if (payableDays <= 0) {
                    console.warn(`⚠️ [RUN_PAYROLL] Skipping ${emp.firstName} - no payable attendance (Payable: ${payableDays})`);
                    skippedList.push({
                        employeeId: item.employeeId,
                        reason: "NO_PAYABLE_ATTENDANCE"
                    });
                    continue; // Skip this employee
                }

                console.log(`✅ [RUN_PAYROLL] Payslip already saved by service: ${payslip._id}`);

                await PayrollRunItem.create({
                    tenantId: req.user.tenantId,
                    payrollRunId: payrollRun._id,
                    employeeId: emp._id,
                    salaryTemplateId: item.salaryTemplateId,
                    attendanceSummary: {
                        totalDays: payslip.attendanceSummary.totalDays,
                        daysPresent: payslip.attendanceSummary.presentDays,
                        daysAbsent: (payslip.attendanceSummary.totalDays - payslip.attendanceSummary.presentDays - payslip.attendanceSummary.holidayDays - payslip.attendanceSummary.leaveDays),
                        leaves: payslip.attendanceSummary.leaveDays,
                        holidays: payslip.attendanceSummary.holidayDays
                    },
                    calculatedGross: payslip.grossEarnings,
                    calculatedNet: payslip.netPay,
                    status: 'Processed'
                });

                successCount++;
                processedList.push(emp._id);
                totalGross += payslip.grossEarnings;
                totalNet += payslip.netPay;
                console.log(`✅ [RUN_PAYROLL] Processed ${emp.firstName} ${emp.lastName}: Gross ${payslip.grossEarnings}, Net ${payslip.netPay}`);

            } catch (err) {
                // Handle specific service errors gracefully
                if (err.message && err.message.includes('no active salary template')) {
                    skippedList.push({
                        employeeId: item.employeeId,
                        reason: "SALARY_TEMPLATE_MISSING"
                    });
                } else {
                    console.error(`❌ [RUN_PAYROLL] Failed to process ${item.employeeId}:`, err);
                    failCount++;
                    // Log fail but don't crash whole run
                    payrollRun.executionErrors.push({
                        employeeId: item.employeeId,
                        message: err.message || "Unknown error",
                        stack: err.stack
                    });

                    try {
                        await PayrollRunItem.create({
                            tenantId: req.user.tenantId,
                            payrollRunId: payrollRun._id,
                            employeeId: item.employeeId,
                            salaryTemplateId: item.salaryTemplateId,
                            attendanceSummary: {},
                            calculatedGross: 0,
                            calculatedNet: 0,
                            status: 'Failed'
                        });
                    } catch (innerErr) {
                        console.error("Critical fail saving failure item:", innerErr);
                    }
                }
            }
        }

        // Update Run Status
        payrollRun.status = 'CALCULATED';
        payrollRun.processedEmployees = successCount;
        payrollRun.failedEmployees = failCount;
        payrollRun.totalGross = totalGross;
        payrollRun.totalNetPay = totalNet;
        payrollRun.totalDeductions = totalGross - totalNet;
        await payrollRun.save();

        // Respond with Complete Summary
        console.log(`✅ [RUN_PAYROLL] SUCCESS: processed ${successCount}, skipped ${skippedList.length}`);

        // Respond with Summary (200 OK)
        res.json({
            success: true,
            data: {
                payrollRunId: payrollRun._id,
                month: payrollRun.month,
                year: payrollRun.year,
                status: payrollRun.status,
                totalEmployees: items.length,
                processedEmployees: successCount,
                failedEmployees: failCount,
                skippedEmployees: skippedList.length,
                totalGross: totalGross,
                totalDeductions: 0, // Can be calculated if needed
                totalNetPay: totalNet,
                skippedList: skippedList,
                processedList: processedList,
                errors: failCount > 0 ? 
                    skippedList.map(s => ({
                        employeeId: s.employeeId,
                        message: s.reason
                    })) : []
            },
            message: `Payroll processed: ${successCount} successful, ${failCount} failed, ${skippedList.length} skipped`
        });

    } catch (error) {
        console.error("Run Payroll Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
