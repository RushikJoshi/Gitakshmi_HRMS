/**
 * Payslip Controller
 * Helper to get models from tenant database
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

/**
 * Get all payslips for HR admin view
 * GET /api/payroll/payslips
 */
exports.getPayslips = async (req, res) => {
    try {
        const tenantDB = req.tenantDB;
        const Payslip = tenantDB.model('Payslip');

        // Fetch all payslips for the tenant
        const payslips = await Payslip.find({})
            .sort({ year: -1, month: -1, createdAt: -1 });

        res.json({ success: true, data: payslips });
    } catch (error) {
        console.error("[GET_PAYSLIPS] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

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
 * GET /api/payroll/payslips/my
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
 * Generate and download payslip PDF (On-the-fly)
 * POST /api/payroll/payslips/:id/generate-pdf
 */
exports.generatePayslipPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantDB = req.tenantDB;
        const Payslip = tenantDB.model('Payslip');

        const payslip = await Payslip.findById(id);
        if (!payslip) {
            return res.status(404).json({ success: false, message: 'Payslip not found' });
        }

        // Use PDFKit to generate PDF
        const PDFDocument = require('pdfkit'); // Lazy load
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Payslip_${payslip.employeeInfo?.name || 'Emp'}_${payslip.month}-${payslip.year}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('PAYSLIP', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`${new Date(0, payslip.month - 1).toLocaleString('default', { month: 'long' })} ${payslip.year}`, { align: 'center' });
        doc.moveDown(2);

        // Employee Info
        doc.fontSize(14).text('Employee Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Name: ${payslip.employeeInfo?.name || 'N/A'}`);
        doc.text(`Employee ID: ${payslip.employeeInfo?.employeeId || 'N/A'}`);
        doc.text(`Department: ${payslip.employeeInfo?.department || 'N/A'}`);
        doc.text(`Designation: ${payslip.employeeInfo?.designation || 'N/A'}`);
        doc.moveDown(2);

        // Earnings Section
        doc.fontSize(14).text('Earnings', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        if (payslip.earningsSnapshot && payslip.earningsSnapshot.length > 0) {
            payslip.earningsSnapshot.forEach(e => {
                doc.text(`${e.name}`, 50, doc.y, { continued: true });
                doc.text(`₹${e.amount?.toLocaleString()}`, { align: 'right' });
            });
        }
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold');
        doc.text('Gross Earnings', 50, doc.y, { continued: true });
        doc.text(`₹${payslip.grossEarnings?.toLocaleString()}`, { align: 'right' });
        doc.font('Helvetica');
        doc.moveDown(2);

        // Deductions Section
        doc.fontSize(14).text('Deductions', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        if (payslip.preTaxDeductionsSnapshot && payslip.preTaxDeductionsSnapshot.length > 0) {
            payslip.preTaxDeductionsSnapshot.forEach(d => {
                doc.text(`${d.name}`, 50, doc.y, { continued: true });
                doc.text(`₹${d.amount?.toLocaleString()}`, { align: 'right' });
            });
        }

        if (payslip.incomeTax > 0) {
            doc.text('Income Tax (TDS)', 50, doc.y, { continued: true });
            doc.text(`₹${payslip.incomeTax?.toLocaleString()}`, { align: 'right' });
        }

        if (payslip.postTaxDeductionsSnapshot && payslip.postTaxDeductionsSnapshot.length > 0) {
            payslip.postTaxDeductionsSnapshot.forEach(d => {
                doc.text(`${d.name}`, 50, doc.y, { continued: true });
                doc.text(`₹${d.amount?.toLocaleString()}`, { align: 'right' });
            });
        }

        const totalDeductions = (payslip.preTaxDeductionsTotal || 0) + (payslip.incomeTax || 0) + (payslip.postTaxDeductionsTotal || 0);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold');
        doc.text('Total Deductions', 50, doc.y, { continued: true });
        doc.text(`₹${totalDeductions.toLocaleString()}`, { align: 'right' });
        doc.font('Helvetica');
        doc.moveDown(2);

        // Net Pay
        doc.fontSize(16).fillColor('#059669');
        doc.font('Helvetica-Bold');
        doc.text('Net Pay', 50, doc.y, { continued: true });
        doc.text(`₹${payslip.netPay?.toLocaleString()}`, { align: 'right' });
        doc.fillColor('#000000');
        doc.font('Helvetica');
        doc.moveDown(2);

        // Attendance Summary
        if (payslip.attendanceSummary) {
            doc.fontSize(14).text('Attendance Summary', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);
            doc.text(`Total Days: ${payslip.attendanceSummary.totalDays || 0}`);
            doc.text(`Present Days: ${payslip.attendanceSummary.presentDays || 0}`);
            doc.text(`Leave Days: ${payslip.attendanceSummary.leaveDays || 0}`);
            doc.text(`LOP Days: ${payslip.attendanceSummary.lopDays || 0}`);
        }

        // Footer
        doc.moveDown(3);
        doc.fontSize(8).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.text('This is a system-generated document', { align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('[GENERATE_PDF] Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        }
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

        const { id } = req.params;
        const tenantDB = req.tenantDB;
        const Payslip = tenantDB.model('Payslip');

        // Note: You might want to ensure the user owns this payslip or is HR
        const payslip = await Payslip.findById(id);

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
 * LEGACY/SERVICE: Download payslip PDF using payslipPDF.service
 * GET /api/payroll/payslips/:id/download
 */
exports.downloadPayslipPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantDB = req.tenantDB;
        const Payslip = tenantDB.model('Payslip');

        const filter = { _id: id };
        // If employee, limit to own
        if (req.user.role === 'Employee') {
            filter.employeeId = req.user.id || req.user._id;
        }

        const payslip = await Payslip.findOne(filter);
        if (!payslip) {
            return res.status(404).json({ success: false, error: "Payslip not found" });
        }

        try {
            // Generate PDF using service
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
