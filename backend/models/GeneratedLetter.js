const mongoose = require('mongoose');

const generatedLetterSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Applicant',
        required: false
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LetterTemplate'
    },

    // Type info
    letterType: {
        type: String,
        enum: ['offer', 'joining', 'relieving', 'experience'],
        required: true
    },

    // Snapshot of the data used to generate this specific letter
    // Important in case candidate details change later in DB
    snapshotData: {
        candidateName: String,
        designation: String,
        department: String,
        ctc: Number,
        joiningDate: Date,
        location: String
    },

    // Snapshot of the template used (for versioning/audit)
    templateSnapshot: {
        bodyContent: String,
        contentJson: Object
    },

    // File Details
    pdfPath: {
        type: String,
        required: true
    },
    pdfUrl: {
        type: String,
        required: true
    },

    // Status Flow
    status: {
        type: String,
        enum: ['generated', 'sent', 'viewed', 'accepted', 'rejected', 'expired'],
        default: 'generated'
    },

    // Metadata
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sentAt: { type: Date },
    acceptedAt: { type: Date }

}, { timestamps: true });

generatedLetterSchema.index({ pdfPath: 1 });
generatedLetterSchema.index({ tenantId: 1, applicantId: 1 });
generatedLetterSchema.index({ tenantId: 1, letterType: 1 });

// Multi-tenant fix: Export ONLY Schema (not mongoose.model)
module.exports = generatedLetterSchema;
