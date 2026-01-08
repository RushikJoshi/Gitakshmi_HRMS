/**
 * Get models from tenant database
 */
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error('Tenant database connection not available');
    }
    try {
        return {
            Payslip: req.tenantDB.model('Payslip'),
            Employee: req.tenantDB.model('Employee')
        };
    } catch (err) {
        console.error('[getModels] Error retrieving models in payslip.controller:', err.message);
        throw new Error(`Failed to retrieve models from tenant database: ${err.message}`);
    }
}

/**
 * Get employee payslips (for employee self-service)
 * GET /api/payroll/payslips/my
 */
exports.getMyPayslips = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const employeeId = req.user.id || req.user._id;
        const { year, month } = req.query;

        const { Payslip } = getModels(req);

        const filter = { tenantId, employeeId };
        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);

        const payslips = await Payslip.find(filter)
            .populate('payrollRunId', 'status month year')
            .sort({ year: -1, month: -1 });

        res.json({
            success: true,
            data: payslips
        });

    } catch (error) {
        console.error('[getMyPayslips] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get payslip by ID (for employee self-service)
 * GET /api/payroll/payslips/:id
 */
exports.getPayslipById = async (req, res) => {
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
        const employeeId = req.user.id || req.user._id;

        const { Payslip } = getModels(req);

        // Get payslip - employees can only view their own payslips
        const payslip = await Payslip.findOne({ _id: id, tenantId, employeeId })
            .populate('payrollRunId', 'status month year')
            .populate('employeeId', 'firstName lastName employeeId');

        if (!payslip) {
            return res.status(404).json({ success: false, error: "Payslip not found" });
        }

        res.json({
            success: true,
            data: payslip
        });

    } catch (error) {
        console.error('[getPayslipById] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get all payslips (for HR - with employee filter)
 * GET /api/payroll/payslips
 */
exports.getPayslips = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { employeeId, year, month, payrollRunId } = req.query;

        const { Payslip } = getModels(req);

        const filter = { tenantId };
        if (employeeId) filter.employeeId = employeeId;
        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);
        if (payrollRunId) filter.payrollRunId = payrollRunId;

        const payslips = await Payslip.find(filter)
            .populate('employeeId', 'firstName lastName employeeId')
            .populate('payrollRunId', 'status month year')
            .sort({ year: -1, month: -1, 'employeeInfo.employeeId': 1 });

        res.json({
            success: true,
            data: payslips
        });

    } catch (error) {
        console.error('[getPayslips] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Download payslip PDF
 * GET /api/payroll/payslips/:id/download
 * TODO: Implement PDF generation
 */
exports.downloadPayslipPDF = async (req, res) => {
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
        const employeeId = req.user.id || req.user._id;
        const isHR = req.user.role === 'hr' || req.user.role === 'admin';

        const { Payslip } = getModels(req);

        // Get payslip
        const filter = { _id: id, tenantId };
        if (!isHR) {
            filter.employeeId = employeeId; // Employees can only download their own payslips
        }

        const payslip = await Payslip.findOne(filter);
        if (!payslip) {
            return res.status(404).json({ success: false, error: "Payslip not found" });
        }

        // TODO: Generate PDF if not exists, or return existing PDF
        if (payslip.pdfPath) {
            const path = require('path');
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', payslip.pdfPath);
            
            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.month}-${payslip.year}-${payslip.employeeInfo.employeeId}.pdf"`);
                return res.sendFile(filePath);
            }
        }

        // PDF not generated yet
        return res.status(404).json({
            success: false,
            error: "PDF not available",
            message: "Payslip PDF has not been generated yet"
        });

    } catch (error) {
        console.error('[downloadPayslipPDF] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

