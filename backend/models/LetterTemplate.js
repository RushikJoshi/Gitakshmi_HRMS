const mongoose = require('mongoose');

const letterTemplateSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['offer', 'joining', 'relieving', 'experience'],
        default: 'offer',
        required: true
    },

    // Template Type: Use Letter Pad, Blank Page, or Word Template
    templateType: {
        type: String,
        enum: ['LETTER_PAD', 'BLANK', 'WORD'],
        default: 'BLANK',
        required: true
    },

    // The main content body (HTML from Rich Text Editor)
    bodyContent: {
        type: String,
        required: false // Not required for Syncfusion (SFDT) mode
    },

    // Header & Footer (Repeatable Sections)
    hasHeader: { type: Boolean, default: true },
    headerContent: { type: String, default: '' },
    headerHeight: { type: Number, default: 40 },

    hasFooter: { type: Boolean, default: true },
    footerContent: { type: String, default: '' },
    footerHeight: { type: Number, default: 30 },

    // Structured JSON for TipTap Editor Re-hydration
    contentJson: {
        type: Object,
        default: {}
    },

    // Page Layout Settings (margins, orientation)
    pageLayout: {
        orientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        },
        margins: {
            top: { type: Number, default: 20 },
            bottom: { type: Number, default: 20 },
            left: { type: Number, default: 20 },
            right: { type: Number, default: 20 }
        }
    },

    // Configuration for Optional Sections
    structure: {
        hasAnnexure: { type: Boolean, default: false },
        annexureContent: { type: String },

        hasNDA: { type: Boolean, default: false },
        ndaContent: { type: String },

        hasPolicies: { type: Boolean, default: false },
        policiesContent: { type: String }
    },

    // For Word templates
    filePath: { type: String }, // Path to uploaded .docx file
    version: { type: String }, // e.g., v1.0
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    placeholders: [{ type: String }], // Array of placeholder names found in the template
    placeholderMapping: { type: Map, of: String }, // Maps placeholder to employee field, e.g., {'EMPLOYEE_NAME': 'name'}

    // Template-specific overrides (optional)
    overrides: {
        watermarkText: { type: String },
        signatoryName: { type: String },
        signatoryDesignation: { type: String }
    },

    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, { timestamps: true });

// Ensure only one default template per type per tenant
letterTemplateSchema.index({ tenantId: 1, type: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

// Multi-tenant fix: Export ONLY Schema (not mongoose.model)
module.exports = letterTemplateSchema;
