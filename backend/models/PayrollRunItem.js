const mongoose = require('mongoose');

const PayrollRunItemSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    payrollRunId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PayrollRun',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    salaryTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalaryTemplate',
        required: true
    },
    attendanceSummary: {
        totalDays: Number,
        daysPresent: Number,
        daysAbsent: Number,
        leaves: Number,
        holidays: Number
    },
    calculatedGross: { type: Number, required: true },
    calculatedNet: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Processed', 'Failed'],
        default: 'Pending'
    }
}, { timestamps: true });

// Compound index to prevent duplicates in a run
PayrollRunItemSchema.index({ payrollRunId: 1, employeeId: 1 }, { unique: true });

module.exports = PayrollRunItemSchema;
