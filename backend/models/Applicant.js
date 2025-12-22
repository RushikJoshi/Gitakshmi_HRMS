const mongoose = require('mongoose');

const ApplicantSchema = new mongoose.Schema({
  requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true },

  // Personal Details
  name: { type: String, trim: true, required: true },
  email: { type: String, trim: true, required: true, lowercase: true },
  mobile: { type: String, trim: true, required: true },
  emergencyContact: { type: String, trim: true },
  dob: { type: Date },
  workLocation: { type: String, trim: true },

  // Professional Details
  intro: { type: String, trim: true },
  experience: { type: String, trim: true, required: true }, // Total Experience
  relevantExperience: { type: String, trim: true },
  currentCompany: { type: String, trim: true },
  currentDesignation: { type: String, trim: true },
  currentlyWorking: { type: Boolean, default: false },
  noticePeriod: { type: Boolean, default: false },
  currentCTC: { type: String, trim: true },
  takeHome: { type: String, trim: true },
  expectedCTC: { type: String, trim: true },
  isFlexible: { type: Boolean, default: false },
  hasOtherOffer: { type: Boolean, default: false },
  relocate: { type: Boolean, default: false },
  reasonForChange: { type: String, trim: true },
  linkedin: { type: String, trim: true },

  resume: { type: String, trim: true }, // File path or URL

  // Offer Details
  status: { type: String, enum: ['Applied', 'Shortlisted', 'Selected', 'Rejected'], default: 'Applied' },
  offerLetterPath: { type: String },
  joiningDate: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add index for better query performance
ApplicantSchema.index({ requirementId: 1, status: 1 });
ApplicantSchema.index({ email: 1 });

module.exports = ApplicantSchema;