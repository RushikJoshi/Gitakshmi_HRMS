/**
 * Payslip Controller - Helper to get models from tenant database
 */
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error("Tenant database connection not available");
    }
    const db = req.tenantDB;
    try {
        return {
            Payslip: db.model("Payslip"),
            PayrollRun: db.model("PayrollRun"),
            Employee: db.model("Employee")
        };
    } catch (err) {
        console.error("[payslip.controller] Error retrieving models:", err.message);
        throw new Error(`Failed to retrieve models from tenant database: ${err.message}`);
    }
}

const PayslipController = {};

/**
 * Get payslip for a specific employee and period
 * GET /api/payslip/:employeeId/:period
 */
exports.getPayslip = async (req, res) => {
    try {
        const { employeeId, period } = req.params;
        const tenantId = req.user.tenantId;

        const { Payslip, Employee } = getModels(req);

        // Find the payslip for the period
        const payslip = await Payslip.findOne({ tenantId, employeeId, period }).lean();

        if (!payslip) {
            return res.status(404).json({ success: false, message: "Payslip not found for this period" });
        }

        // Populate employee details for display
        const employee = await Employee.findById(employeeId).select('firstName lastName employeeId department designation bankDetails').lean();

        res.json({
            success: true,
            data: {
                employee,
                period,
                earnings: payslip.earnings,
                deductions: payslip.deductions,
                benefits: payslip.benefits,
                attendance: payslip.attendance,
                totals: {
                    grossEarnings: payslip.grossEarnings,
                    totalDeductions: payslip.totalDeductions,
                    netPay: payslip.netPay
                }
            }
        });

    } catch (error) {
        console.error("[GET_PAYSLIP] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all payslips for the logged-in employee
 * GET /api/payslip/my
 */
exports.getMyPayslips = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user._id;
        const tenantId = req.user.tenantId;
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

        try {
            // Generate PDF on-the-fly
            const payslipPDFService = require('../services/payslipPDF.service');
            const pdfBuffer = await payslipPDFService.generatePayslipPDF(payslip.toObject());

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.month}-${payslip.year}_${payslip.employeeInfo?.employeeId || 'Unknown'}.pdf"`);
            res.send(pdfBuffer);

        } catch (pdfError) {
            console.error('[downloadPayslipPDF] PDF Generation Error:', pdfError);
            res.status(500).json({
                success: false,
                error: "PDF generation failed",
                message: pdfError.message
            });
        }

    } catch (error) {
        console.error('[downloadPayslipPDF] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getPayslip: exports.getPayslip,
    getMyPayslips: exports.getMyPayslips,
    getPayslipById: exports.getPayslipById,
    getPayslips: exports.getPayslips,
    downloadPayslipPDF: exports.downloadPayslipPDF
};
