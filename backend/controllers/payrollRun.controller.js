const payrollService = require('../services/payroll.service');

/**
 * Get models from tenant database
 */
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error('Tenant database connection not available');
    }
    try {
        return {
            PayrollRun: req.tenantDB.model('PayrollRun'),
            Payslip: req.tenantDB.model('Payslip'),
            Employee: req.tenantDB.model('Employee')
        };
    } catch (err) {
        console.error('[getModels] Error retrieving models in payrollRun.controller:', err.message);
        throw new Error(`Failed to retrieve models from tenant database: ${err.message}`);
    }
}

/**
 * Initiate a new payroll run
 * POST /api/payroll/runs
 */
exports.initiatePayrollRun = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { month, year } = req.body;

        // Validate input
        if (!month || !year) {
            return res.status(400).json({ success: false, error: "Missing required fields: month and year are required" });
        }

        if (month < 1 || month > 12) {
            return res.status(400).json({ success: false, error: "Invalid month. Must be between 1 and 12" });
        }

        if (year < 2000 || year > 2100) {
            return res.status(400).json({ success: false, error: "Invalid year" });
        }

        const { PayrollRun } = getModels(req);

        // Check if payroll run already exists
        const existing = await PayrollRun.findOne({ tenantId, month, year });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: "Payroll run already exists",
                data: existing,
                message: `Payroll for ${month}/${year} already exists with status: ${existing.status}`
            });
        }

        // Create new payroll run
        const payrollRun = new PayrollRun({
            tenantId,
            month,
            year,
            status: 'INITIATED',
            initiatedBy: req.user.id || req.user._id
        });

        await payrollRun.save();

        res.status(201).json({
            success: true,
            data: payrollRun,
            message: 'Payroll run initiated successfully'
        });

    } catch (error) {
        console.error('[initiatePayrollRun] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Calculate payroll (process all employees)
 * POST /api/payroll/runs/:id/calculate
 */
exports.calculatePayroll = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { id } = req.params;

        const { PayrollRun } = getModels(req);

        // Get payroll run
        const payrollRun = await PayrollRun.findOne({ _id: id, tenantId });
        if (!payrollRun) {
            return res.status(404).json({ success: false, error: "Payroll run not found" });
        }

        if (payrollRun.status !== 'INITIATED') {
            return res.status(400).json({
                success: false,
                error: "Invalid status",
                message: `Payroll run is already ${payrollRun.status}. Cannot calculate again.`
            });
        }

        // Run payroll calculation
        const result = await payrollService.runPayroll(
            req.tenantDB,
            tenantId,
            payrollRun.month,
            payrollRun.year,
            req.user.id || req.user._id
        );

        res.json({
            success: true,
            data: result,
            message: `Payroll calculated successfully. Processed: ${result.processedEmployees}/${result.totalEmployees} employees.`
        });

    } catch (error) {
        console.error('[calculatePayroll] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Approve payroll run
 * POST /api/payroll/runs/:id/approve
 */
exports.approvePayroll = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { id } = req.params;

        const { PayrollRun } = getModels(req);

        // Get payroll run
        const payrollRun = await PayrollRun.findOne({ _id: id, tenantId });
        if (!payrollRun) {
            return res.status(404).json({ success: false, error: "Payroll run not found" });
        }

        if (payrollRun.status !== 'CALCULATED') {
            return res.status(400).json({
                success: false,
                error: "Invalid status",
                message: `Payroll run status must be CALCULATED. Current status: ${payrollRun.status}`
            });
        }

        // Update status
        payrollRun.status = 'APPROVED';
        payrollRun.approvedBy = req.user.id || req.user._id;
        payrollRun.approvedAt = new Date();
        await payrollRun.save();

        res.json({
            success: true,
            data: payrollRun,
            message: 'Payroll approved successfully'
        });

    } catch (error) {
        console.error('[approvePayroll] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Mark payroll as paid
 * POST /api/payroll/runs/:id/mark-paid
 */
exports.markPayrollPaid = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { id } = req.params;

        const { PayrollRun } = getModels(req);

        // Get payroll run
        const payrollRun = await PayrollRun.findOne({ _id: id, tenantId });
        if (!payrollRun) {
            return res.status(404).json({ success: false, error: "Payroll run not found" });
        }

        if (payrollRun.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                error: "Invalid status",
                message: `Payroll run status must be APPROVED. Current status: ${payrollRun.status}`
            });
        }

        // Update status
        payrollRun.status = 'PAID';
        payrollRun.paidBy = req.user.id || req.user._id;
        payrollRun.paidAt = new Date();
        await payrollRun.save();

        res.json({
            success: true,
            data: payrollRun,
            message: 'Payroll marked as paid successfully'
        });

    } catch (error) {
        console.error('[markPayrollPaid] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get all payroll runs
 * GET /api/payroll/runs
 */
exports.getPayrollRuns = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { status, year } = req.query;

        const { PayrollRun } = getModels(req);

        const filter = { tenantId };
        if (status) filter.status = status;
        if (year) filter.year = parseInt(year);

        const payrollRuns = await PayrollRun.find(filter)
            .populate('initiatedBy', 'firstName lastName employeeId')
            .populate('calculatedBy', 'firstName lastName employeeId')
            .populate('approvedBy', 'firstName lastName employeeId')
            .populate('paidBy', 'firstName lastName employeeId')
            .sort({ year: -1, month: -1 });

        res.json({
            success: true,
            data: payrollRuns
        });

    } catch (error) {
        console.error('[getPayrollRuns] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get payroll run by ID
 * GET /api/payroll/runs/:id
 */
exports.getPayrollRunById = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { id } = req.params;

        const { PayrollRun, Payslip } = getModels(req);

        // Get payroll run
        const payrollRun = await PayrollRun.findOne({ _id: id, tenantId })
            .populate('initiatedBy', 'firstName lastName employeeId')
            .populate('calculatedBy', 'firstName lastName employeeId')
            .populate('approvedBy', 'firstName lastName employeeId')
            .populate('paidBy', 'firstName lastName employeeId');

        if (!payrollRun) {
            return res.status(404).json({ success: false, error: "Payroll run not found" });
        }

        // Get payslips for this run
        const payslips = await Payslip.find({ tenantId, payrollRunId: id })
            .populate('employeeId', 'firstName lastName employeeId')
            .sort({ 'employeeInfo.employeeId': 1 });

        res.json({
            success: true,
            data: {
                payrollRun,
                payslips
            }
        });

    } catch (error) {
        console.error('[getPayrollRunById] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Cancel payroll run
 * POST /api/payroll/runs/:id/cancel
 */
exports.cancelPayrollRun = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { id } = req.params;

        const { PayrollRun, Payslip } = getModels(req);

        // Get payroll run
        const payrollRun = await PayrollRun.findOne({ _id: id, tenantId });
        if (!payrollRun) {
            return res.status(404).json({ success: false, error: "Payroll run not found" });
        }

        if (payrollRun.status === 'PAID') {
            return res.status(400).json({
                success: false,
                error: "Cannot cancel paid payroll",
                message: "Cannot cancel a payroll run that has been marked as paid"
            });
        }

        // Delete associated payslips if status is CALCULATED or APPROVED
        if (payrollRun.status === 'CALCULATED' || payrollRun.status === 'APPROVED') {
            await Payslip.deleteMany({ tenantId, payrollRunId: id });
        }

        // Update status
        payrollRun.status = 'CANCELLED';
        await payrollRun.save();

        res.json({
            success: true,
            data: payrollRun,
            message: 'Payroll run cancelled successfully'
        });

    } catch (error) {
        console.error('[cancelPayrollRun] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

