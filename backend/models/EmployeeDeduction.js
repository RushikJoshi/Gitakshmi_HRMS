const mongoose = require('mongoose');

const employeeDeductionSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    deductionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeductionMaster',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    customValue: {
        type: Number,
        default: null // If null, use the value from DeductionMaster
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED'],
        default: 'ACTIVE'
    }
}, {
    timestamps: true
});

// Index for quick lookups
employeeDeductionSchema.index({ tenantId: 1, employeeId: 1 });

// Multi-tenant fix: Export ONLY Schema (not mongoose.model)
module.exports = employeeDeductionSchema;
