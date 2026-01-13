const mongoose = require('mongoose');

/**
 * PayrollRun Model
 * Tracks monthly payroll processing runs
 * - One record per tenant per month
 * - Status tracking: INITIATED → CALCULATED → APPROVED → PAID
 * - Prevents duplicate payroll runs
 */
const PayrollRunSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true,
        min: 2000,
        max: 2100
    },
    status: {
        type: String,
        enum: ['INITIATED', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED', 'DRAFT', 'PROCESSING'],
        default: 'INITIATED',
        index: true
    },

    // Metadata
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    calculatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },

    // Timestamps
    initiatedAt: {
        type: Date,
        default: Date.now
    },
    calculatedAt: {
        type: Date
    },
    approvedAt: {
        type: Date
    },
    paidAt: {
        type: Date
    },

    // Statistics
    totalEmployees: {
        type: Number,
        default: 0
    },
    processedEmployees: {
        type: Number,
        default: 0
    },
    failedEmployees: {
        type: Number,
        default: 0
    },

    // Totals (for reporting)
    totalGross: {
        type: Number,
        default: 0
    },
    totalDeductions: {
        type: Number,
        default: 0
    },
    totalNetPay: {
        type: Number,
        default: 0
    },

    // Errors & Notes
    executionErrors: [{
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        message: String,
        stack: String
    }],
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Compound unique index: one payroll run per tenant per month/year
PayrollRunSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });

// Index for status queries
PayrollRunSchema.index({ tenantId: 1, status: 1 });

// Multi-tenant fix: Export ONLY Schema (not mongoose.model)
module.exports = PayrollRunSchema;

