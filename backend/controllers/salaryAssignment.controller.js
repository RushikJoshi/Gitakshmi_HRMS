const mongoose = require('mongoose');

// Helper to get models from tenant DB
const getModels = (req) => {
    if (!req.tenantDB) {
        throw new Error('Tenant database connection not available');
    }
    return {
        SalaryAssignment: req.tenantDB.model('SalaryAssignment'),
        SalaryTemplate: req.tenantDB.model('SalaryTemplate'),
        Employee: req.tenantDB.model('Employee')
    };
};

/**
 * Assign a salary template to an employee
 * POST /api/payroll/assign-template
 */
exports.assignTemplate = async (req, res) => {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const tenantId = req.user.tenantId;
        const { employeeId, salaryTemplateId, effectiveFrom } = req.body;

        if (!employeeId || !salaryTemplateId || !effectiveFrom) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const { SalaryAssignment, SalaryTemplate, Employee } = getModels(req);

        // Validate existence
        const employee = await Employee.findOne({ _id: employeeId, tenant: tenantId });
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        const template = await SalaryTemplate.findOne({ _id: salaryTemplateId, tenantId });
        if (!template) return res.status(404).json({ success: false, message: "Salary Template not found" });

        const effectiveDate = new Date(effectiveFrom);
        if (isNaN(effectiveDate.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid effective date" });
        }

        // Create assignment (Compatible with new schema)
        const assignment = new SalaryAssignment({
            tenantId,
            employeeId,
            salaryTemplateId,
            effectiveFrom: effectiveDate,
            ctcAnnual: template.annualCTC || 0,
            monthlyCTC: template.monthlyCTC || Math.round(((template.annualCTC || 0) / 12) * 100) / 100,
            assignedBy: req.user.id || req.user._id
        });

        await assignment.save();

        // If effective date is today or past, update the employee record directly as "Current"
        // This maintains backward compatibility and allows quick access
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (effectiveDate <= today) {
            employee.salaryTemplateId = salaryTemplateId;
            await employee.save();
        }

        res.status(201).json({
            success: true,
            data: assignment,
            message: "Salary template assigned successfully"
        });

    } catch (error) {
        console.error("assignTemplate Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get assignment history for an employee
 * GET /api/payroll/history/:employeeId
 */
exports.getAssignmentHistory = async (req, res) => {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const tenantId = req.user.tenantId;
        const { employeeId } = req.params;

        const { SalaryAssignment } = getModels(req);

        const history = await SalaryAssignment.find({ tenantId, employeeId })
            .populate('salaryTemplateId', 'templateName annualCTC')
            .populate('assignedBy', 'firstName lastName')
            .sort({ effectiveFrom: -1 });

        res.json({ success: true, data: history });
    } catch (error) {
        console.error("getAssignmentHistory Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
