const mongoose = require('mongoose');

const LeavePolicySchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // Who does this policy apply to?
    applicableTo: {
        type: String,
        enum: ['All', 'Department', 'Role', 'Specific'],
        default: 'All'
    },
    // If specific departments or roles
    departmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    roles: [{ type: String, trim: true }],

    effectiveFrom: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },

    // Array of rules defined in this policy
    rules: [{
        leaveType: { type: String, required: true, trim: true }, // e.g. "CL", "SL", "LWP"
        totalPerYear: { type: Number, default: 0 },
        monthlyAccrual: { type: Boolean, default: false }, // If true, adds Total/12 every month
        carryForwardAllowed: { type: Boolean, default: false },
        maxCarryForward: { type: Number, default: 0 },
        requiresApproval: { type: Boolean, default: true },
        allowDuringProbation: { type: Boolean, default: false }, // If false, 0 balance during probation
        color: { type: String, default: '#3b82f6' } // Default blue-500
    }]
}, { timestamps: true });

LeavePolicySchema.index({ tenant: 1, name: 1 });

module.exports = LeavePolicySchema;
