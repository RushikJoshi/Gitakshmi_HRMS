const mongoose = require('mongoose');

const CompanyPayrollRuleSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, unique: true },

    // Basic Salary Rules
    basicSalary: {
        percentageOfCTC: { type: Number, default: 40 }, // e.g. 40%
        enabled: { type: Boolean, default: true }
    },

    // HRA Rules
    hra: {
        percentageOfBasic: { type: Number, default: 40 }, // e.g. 40% or 50%
        enabled: { type: Boolean, default: true }
    },

    // Conveyance
    conveyance: {
        type: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'FIXED' },
        value: { type: Number, default: 1600 }, // Monthly fixed amount
        enabled: { type: Boolean, default: true }
    },

    // Medical Allowance
    medical: {
        type: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'FIXED' },
        value: { type: Number, default: 1250 }, // Monthly fixed amount
        enabled: { type: Boolean, default: true }
    },

    // PF Rules
    pf: {
        enabled: { type: Boolean, default: true },
        employeeRate: { type: Number, default: 12 }, // 12%
        employerRate: { type: Number, default: 12 }, // 12%
        wageCeiling: { type: Number, default: 15000 },
        capContribution: { type: Boolean, default: true }, // Whether to cap calculation at 15000 basic
        includeInCTC: { type: Boolean, default: true } // Employer contribution moves out of Special Allowance
    },

    // ESIC Rules
    esic: {
        enabled: { type: Boolean, default: true },
        employeeRate: { type: Number, default: 0.75 },
        employerRate: { type: Number, default: 3.25 },
        wageCeiling: { type: Number, default: 21000 },
        includeInCTC: { type: Boolean, default: true }
    },

    // Professional Tax (Simple Slab for MVP, can be expanded to array of states)
    professionalTax: {
        enabled: { type: Boolean, default: true },
        defaultAmount: { type: Number, default: 200 } // Default monthly
    },

    updatedAt: { type: Date, default: Date.now }
});

module.exports = CompanyPayrollRuleSchema;
