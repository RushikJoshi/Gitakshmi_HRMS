const mongoose = require('mongoose');

/**
 * SalaryAssignment Model
 * Tracks the history of salary template assignments to employees.
 * Allows for future-dating salary changes and keeping a record of past structures.
 */
const SalaryAssignmentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    salaryTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalaryTemplate',
        required: true
    },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null }, // Null means current/indefinite
    payFrequency: { type: String, default: 'Monthly', enum: ['Monthly'] },
    status: { type: String, default: 'Active', enum: ['Active', 'Inactive'] },
    isCurrent: { type: Boolean, default: true },
    // Snapshot of the template values at time of assignment (optional but good for audit)
    assignmentSnapshot: {
        annualCTC: Number,
        monthlyCTC: Number
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true
});

// Index for finding the active assignment for a specific date
SalaryAssignmentSchema.index({ tenantId: 1, employeeId: 1, effectiveFrom: -1 });

module.exports = SalaryAssignmentSchema;
