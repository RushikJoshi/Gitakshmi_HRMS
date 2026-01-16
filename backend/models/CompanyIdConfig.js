const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompanyIdConfigSchema = new Schema({
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    entityType: {
        type: String,
        enum: ['EMPLOYEE', 'JOB', 'OFFER', 'APPLICATION', 'PAYSLIP', 'CANDIDATE'],
        required: true
    },
    prefix: {
        type: String,
        default: '',
        trim: true,
        uppercase: true
    },
    separator: {
        type: String,
        default: '-',
        trim: true
    },
    includeYear: {
        type: Boolean,
        default: true
    },
    includeMonth: {
        type: Boolean,
        default: false
    },
    includeDepartment: {
        type: Boolean, // e.g. EMP-IT-001
        default: false
    },
    padding: {
        type: Number,
        default: 4,
        min: 2,
        max: 10
    },
    startFrom: {
        type: Number,
        default: 1,
        min: 1
    },
    currentSeq: {
        type: Number,
        default: 1
    },
    resetPolicy: {
        type: String,
        enum: ['NEVER', 'YEARLY', 'MONTHLY'],
        default: 'YEARLY'
    },
    updatedBy: {
        type: String
    }
}, {
    timestamps: true
});

// Ensure one config per entity per company
CompanyIdConfigSchema.index({ companyId: 1, entityType: 1 }, { unique: true });

module.exports = mongoose.model('CompanyIdConfig', CompanyIdConfigSchema);
