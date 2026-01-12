const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Payslip Model (IMMUTABLE SNAPSHOT)
 * Stores payroll calculation results as immutable snapshots
 * - Never recalculated once saved
 * - Used for PDF generation and historical records
 * - Includes hash for data integrity verification
 */
const PayslipSchema = new mongoose.Schema({
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
    payrollRunId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PayrollRun',
        required: true,
        index: true
    },

    // Pay Period
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

    // Employee Info Snapshot
    employeeInfo: {
        employeeId: String,
        name: String,
        department: String,
        designation: String,
        bankAccountNumber: String,
        bankIFSC: String,
        bankName: String,
        panNumber: String
    },

    // Earnings Snapshot (from salary template)
    earningsSnapshot: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        isProRata: { type: Boolean, default: false },
        originalAmount: { type: Number }, // Before pro-rata adjustment
        daysWorked: { type: Number }, // For pro-rata calculation
        totalDays: { type: Number }
    }],

    // Pre-Tax Deductions Snapshot
    preTaxDeductionsSnapshot: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        category: { type: String, enum: ['EPF', 'ESI', 'PROFESSIONAL_TAX', 'TDS', 'OTHER'] }
    }],

    // Post-Tax Deductions Snapshot
    postTaxDeductionsSnapshot: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        category: { type: String, enum: ['LOAN', 'LOP', 'ADVANCE', 'PENALTY', 'OTHER'] }
    }],

    // Employer Contributions Snapshot (informational only)
    employerContributionsSnapshot: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true }
    }],

    // Calculated Totals
    grossEarnings: {
        type: Number,
        required: true,
        default: 0
    },
    preTaxDeductionsTotal: {
        type: Number,
        required: true,
        default: 0
    },
    taxableIncome: {
        type: Number,
        required: true,
        default: 0
    },
    incomeTax: {
        type: Number,
        required: true,
        default: 0
    },
    postTaxDeductionsTotal: {
        type: Number,
        required: true,
        default: 0
    },
    netPay: {
        type: Number,
        required: true,
        default: 0
    },

    // Attendance Summary
    attendanceSummary: {
        totalDays: { type: Number },
        presentDays: { type: Number },
        leaveDays: { type: Number },
        lopDays: { type: Number },
        holidayDays: { type: Number }
    },

    // Salary Template Reference (for audit)
    salaryTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalaryTemplate'
    },
    salaryTemplateSnapshot: {
        templateName: String,
        annualCTC: Number,
        monthlyCTC: Number
    },

    // PDF File Path (generated after calculation)
    pdfPath: {
        type: String,
        trim: true
    },

    // Data Integrity Hash
    hash: {
        type: String,
        default: ''
    },

    // Generation Metadata
    generatedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true
});

// Compound unique index: one payslip per employee per month/year
PayslipSchema.index({ tenantId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });

// Index for payroll run queries
PayslipSchema.index({ tenantId: 1, payrollRunId: 1 });

// Index for employee payslip history
PayslipSchema.index({ tenantId: 1, employeeId: 1, year: -1, month: -1 });

/**
 * Generate hash for data integrity
 * Hash is calculated from all financial data
 */
PayslipSchema.methods.generateHash = function () {
    try {
        const data = JSON.stringify({
            grossEarnings: this.grossEarnings || 0,
            preTaxDeductionsTotal: this.preTaxDeductionsTotal || 0,
            taxableIncome: this.taxableIncome || 0,
            incomeTax: this.incomeTax || 0,
            postTaxDeductionsTotal: this.postTaxDeductionsTotal || 0,
            netPay: this.netPay || 0,
            earnings: this.earningsSnapshot ? this.earningsSnapshot.map(e => ({ name: e.name, amount: e.amount })) : [],
            preTax: this.preTaxDeductionsSnapshot ? this.preTaxDeductionsSnapshot.map(d => ({ name: d.name, amount: d.amount })) : [],
            postTax: this.postTaxDeductionsSnapshot ? this.postTaxDeductionsSnapshot.map(d => ({ name: d.name, amount: d.amount })) : []
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    } catch (err) {
        console.error('[PAYSLIP] Error generating hash:', err);
        // Return a fallback hash based on basic data
        return crypto.createHash('sha256').update(`${this.employeeId}-${this.month}-${this.year}-${this.netPay}`).digest('hex');
    }
};

/**
 * Pre-save hook: Generate hash before saving (if not already set)
 */
PayslipSchema.pre('save', async function () {
    // Hash should already be set by the service, but generate if missing
    if (this.isNew || !this.hash || this.isModified('grossEarnings') || this.isModified('netPay')) {
        if (!this.hash) {
            this.hash = this.generateHash();
        }
    }
});

// Multi-tenant fix: Export ONLY Schema (not mongoose.model)
module.exports = PayslipSchema;
