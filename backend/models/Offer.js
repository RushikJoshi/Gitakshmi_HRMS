/**
 * ═══════════════════════════════════════════════════════════════════════
 * OFFER MODEL - Professional Offer Letter Management
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Manages offer letters with salary structure, terms, and acceptance workflow.
 * 
 * Status Flow:
 * DRAFT → SENT → ACCEPTED / REJECTED / EXPIRED
 * 
 * Business Rules:
 * - Can only be created for SELECTED applications
 * - One offer per application
 * - Salary structure must be defined
 * - Expiry date enforced
 * - Acceptance triggers employee creation
 * 
 * @version 2.0
 */

const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════════
    // CORE IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════════

    offerId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        immutable: true,
        // Format: OFF-2026-0001
    },

    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
        immutable: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════════════════

    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
        index: true,
        immutable: true
    },

    applicationReadableId: {
        type: String, // APP-2026-0001
        required: true,
        index: true
    },

    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true,
        index: true
    },

    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Requirement',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // STATUS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    status: {
        type: String,
        enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'],
        default: 'DRAFT',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // CANDIDATE INFORMATION (Snapshot)
    // ═══════════════════════════════════════════════════════════════════

    candidateInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        mobile: { type: String, required: true },
        fatherName: { type: String },
        address: { type: String }
    },

    // ═══════════════════════════════════════════════════════════════════
    // JOB DETAILS
    // ═══════════════════════════════════════════════════════════════════

    jobDetails: {
        title: { type: String, required: true },
        department: { type: String, required: true },
        designation: { type: String },
        location: { type: String },
        reportingTo: { type: String }
    },

    // ═══════════════════════════════════════════════════════════════════
    // SALARY STRUCTURE
    // ═══════════════════════════════════════════════════════════════════

    salaryStructureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalaryStructure',
        required: true
    },

    // Snapshot of salary structure (immutable after sending)
    salarySnapshot: {
        ctc: { type: Number, required: true },
        grossSalary: { type: Number, required: true },
        netSalary: { type: Number, required: true },

        earnings: [{
            componentName: { type: String, required: true },
            componentType: { type: String },
            monthly: { type: Number, required: true },
            yearly: { type: Number, required: true }
        }],

        deductions: [{
            componentName: { type: String, required: true },
            componentType: { type: String },
            monthly: { type: Number, required: true },
            yearly: { type: Number, required: true }
        }],

        employerContributions: [{
            componentName: { type: String, required: true },
            monthly: { type: Number, required: true },
            yearly: { type: Number, required: true }
        }]
    },

    // ═══════════════════════════════════════════════════════════════════
    // EMPLOYMENT TERMS
    // ═══════════════════════════════════════════════════════════════════

    joiningDate: {
        type: Date,
        required: true
    },

    probationPeriod: {
        type: Number, // In months
        default: 3
    },

    noticePeriod: {
        type: Number, // In days
        default: 30
    },

    workingDays: {
        type: String,
        default: 'Monday to Friday'
    },

    workingHours: {
        type: String,
        default: '9:00 AM to 6:00 PM'
    },

    // ═══════════════════════════════════════════════════════════════════
    // OFFER VALIDITY
    // ═══════════════════════════════════════════════════════════════════

    validUntil: {
        type: Date,
        required: true,
        index: true
    },

    isExpired: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════════
    // DOCUMENTS
    // ═══════════════════════════════════════════════════════════════════

    offerLetterPath: {
        type: String, // PDF file path
    },

    joiningLetterPath: {
        type: String, // PDF file path (generated after acceptance)
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LetterTemplate'
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACCEPTANCE / REJECTION
    // ═══════════════════════════════════════════════════════════════════

    sentDate: { type: Date },
    sentBy: { type: String },
    sentById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    acceptedDate: { type: Date },
    acceptedVia: { type: String, enum: ['EMAIL', 'PORTAL', 'MANUAL'], default: 'PORTAL' },
    acceptanceNotes: { type: String },

    rejectedDate: { type: Date },
    rejectionReason: { type: String },

    withdrawnDate: { type: Date },
    withdrawnBy: { type: String },
    withdrawalReason: { type: String },

    // ═══════════════════════════════════════════════════════════════════
    // EMPLOYEE CONVERSION
    // ═══════════════════════════════════════════════════════════════════

    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null
    },

    employeeReadableId: {
        type: String, // EMP-HR-0001
        index: true
    },

    employeeCreatedDate: { type: Date },

    // ═══════════════════════════════════════════════════════════════════
    // ADDITIONAL TERMS
    // ═══════════════════════════════════════════════════════════════════

    benefits: [{
        name: { type: String, required: true },
        description: { type: String }
    }],

    specialTerms: [{
        term: { type: String, required: true }
    }],

    // ═══════════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════════

    statusHistory: [{
        from: { type: String },
        to: { type: String, required: true },
        changedBy: { type: String },
        changedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],

    // ═══════════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════════

    notes: [{
        text: { type: String, required: true },
        addedBy: { type: String },
        addedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }],

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    meta: { type: Object, default: {} }

}, {
    timestamps: true,
    collection: 'offers'
});

// ═══════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════

// Unique constraint: One offer per application
OfferSchema.index({ tenant: 1, applicationId: 1 }, { unique: true });

// Query optimization
OfferSchema.index({ tenant: 1, status: 1, createdAt: -1 });
OfferSchema.index({ tenant: 1, candidateId: 1 });
OfferSchema.index({ tenant: 1, validUntil: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════════

OfferSchema.virtual('canBeSent').get(function () {
    return this.status === 'DRAFT' && this.salarySnapshot && this.joiningDate;
});

OfferSchema.virtual('canBeAccepted').get(function () {
    return this.status === 'SENT' && !this.isExpired;
});

OfferSchema.virtual('canBeRejected').get(function () {
    return ['DRAFT', 'SENT'].includes(this.status) && !this.isExpired;
});

OfferSchema.virtual('canCreateEmployee').get(function () {
    return this.status === 'ACCEPTED' && !this.employeeId;
});

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

// Check expiry before save
OfferSchema.pre('save', function (next) {
    if (this.validUntil && new Date() > this.validUntil && this.status === 'SENT') {
        this.isExpired = true;
        this.status = 'EXPIRED';
    }
    next();
});

// ═══════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Send offer to candidate
 */
OfferSchema.methods.send = function (userId, userName) {
    if (!this.canBeSent) {
        throw new Error(`Cannot send offer. Status: ${this.status}, Missing data: ${!this.salarySnapshot ? 'salary' : 'joining date'}`);
    }

    this.statusHistory.push({
        from: this.status,
        to: 'SENT',
        changedBy: userName,
        changedById: userId,
        timestamp: new Date()
    });

    this.status = 'SENT';
    this.sentDate = new Date();
    this.sentBy = userName;
    this.sentById = userId;

    return this;
};

/**
 * Accept offer
 */
OfferSchema.methods.accept = function (acceptanceNotes = null, via = 'PORTAL') {
    if (!this.canBeAccepted) {
        throw new Error(`Cannot accept offer. Status: ${this.status}, Expired: ${this.isExpired}`);
    }

    this.statusHistory.push({
        from: this.status,
        to: 'ACCEPTED',
        changedBy: this.candidateInfo.name,
        reason: 'Offer accepted by candidate',
        timestamp: new Date()
    });

    this.status = 'ACCEPTED';
    this.acceptedDate = new Date();
    this.acceptanceNotes = acceptanceNotes;
    this.acceptedVia = via;

    return this;
};

/**
 * Reject offer
 */
OfferSchema.methods.reject = function (reason = null) {
    if (!this.canBeRejected) {
        throw new Error(`Cannot reject offer. Status: ${this.status}, Expired: ${this.isExpired}`);
    }

    this.statusHistory.push({
        from: this.status,
        to: 'REJECTED',
        changedBy: this.candidateInfo.name,
        reason: reason || 'Offer rejected by candidate',
        timestamp: new Date()
    });

    this.status = 'REJECTED';
    this.rejectedDate = new Date();
    this.rejectionReason = reason;

    return this;
};

/**
 * Withdraw offer (by company)
 */
OfferSchema.methods.withdraw = function (userId, userName, reason = null) {
    if (['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(this.status)) {
        throw new Error(`Cannot withdraw offer in ${this.status} status`);
    }

    this.statusHistory.push({
        from: this.status,
        to: 'WITHDRAWN',
        changedBy: userName,
        changedById: userId,
        reason: reason,
        timestamp: new Date()
    });

    this.status = 'WITHDRAWN';
    this.withdrawnDate = new Date();
    this.withdrawnBy = userName;
    this.withdrawalReason = reason;

    return this;
};

/**
 * Link employee after creation
 */
OfferSchema.methods.linkEmployee = function (employeeId, employeeReadableId) {
    if (!this.canCreateEmployee) {
        throw new Error(`Cannot link employee. Status: ${this.status}, Existing employee: ${this.employeeId}`);
    }

    this.employeeId = employeeId;
    this.employeeReadableId = employeeReadableId;
    this.employeeCreatedDate = new Date();

    return this;
};

// ═══════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if offer exists for application
 */
OfferSchema.statics.existsForApplication = async function (tenantId, applicationId) {
    const existing = await this.findOne({
        tenant: tenantId,
        applicationId: applicationId,
        isActive: true
    });

    return !!existing;
};

/**
 * Get pending offers (sent but not responded)
 */
OfferSchema.statics.getPendingOffers = async function (tenantId) {
    return this.find({
        tenant: tenantId,
        status: 'SENT',
        isExpired: false,
        isActive: true
    }).sort({ sentDate: -1 });
};

/**
 * Mark expired offers
 */
OfferSchema.statics.markExpiredOffers = async function (tenantId) {
    const result = await this.updateMany(
        {
            tenant: tenantId,
            status: 'SENT',
            validUntil: { $lt: new Date() },
            isExpired: false
        },
        {
            $set: {
                isExpired: true,
                status: 'EXPIRED'
            }
        }
    );

    return result.modifiedCount;
};

module.exports = OfferSchema;
