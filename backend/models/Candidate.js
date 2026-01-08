const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    mobile: { type: String, trim: true },

    // Profile Information
    resume: { type: String }, // Path to default resume
    profilePic: { type: String },
    address: { type: String },
    dob: { type: Date },

    // Meta
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique email PER TENANT
CandidateSchema.index({ tenant: 1, email: 1 }, { unique: true });

module.exports = CandidateSchema;
