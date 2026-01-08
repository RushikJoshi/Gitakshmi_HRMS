const mongoose = require('mongoose');

const deductionMasterSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['PRE_TAX', 'POST_TAX'],
        required: true
    },
    amountType: {
        type: String,
        enum: ['FIXED', 'PERCENTAGE'],
        required: true
    },
    amountValue: {
        type: Number,
        required: true,
        min: 0
    },
    calculationBase: {
        type: String,
        enum: ['BASIC', 'GROSS'],
        required: function () { return this.amountType === 'PERCENTAGE'; }
    },
    recurring: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true
});

// Ensure name is unique within a tenant
deductionMasterSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// Multi-tenant fix: Export ONLY Schema (not mongoose.model)
module.exports = deductionMasterSchema;
