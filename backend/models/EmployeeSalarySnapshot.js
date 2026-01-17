/**
 * EmployeeSalarySnapshot Model
 * 
 * IMMUTABLE snapshot of an employee's or applicant's salary at a point in time
 * Used for:
 * - Joining salary (from offer letter)
 * - Increments
 * - Revisions
 * - Promotions
 * - Payroll calculations
 * 
 * CRITICAL RULES:
 * - NEVER modify a locked snapshot
 * - NEVER delete a snapshot used in payroll
 * - Always create new snapshot for changes
 */
const mongoose = require('mongoose');

const EmployeeSalarySnapshotSchema = new mongoose.Schema({
  // Link to either Employee OR Applicant
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: false,
    index: true
  },

  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Applicant',
    required: false,
    index: true
  },

  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // Reference to the salary template used (if any)
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryTemplate'
  },

  // Total CTC (annual)
  ctc: {
    type: Number,
    required: true
  },

  // Monthly CTC
  monthlyCTC: {
    type: Number,
    required: true
  },

  // Complete earnings breakdown
  earnings: [{
    name: { type: String, required: true },
    componentCode: String,
    calculationType: String,
    formula: String,
    percentage: Number,
    monthlyAmount: { type: Number, required: true },
    annualAmount: { type: Number, required: true },
    taxable: { type: Boolean, default: true },
    proRata: Boolean,
    resolved: { type: Boolean, default: true }
  }],

  // Employer deductions (PF employer contribution, etc.)
  employerDeductions: [{
    name: { type: String, required: true },
    componentCode: String,
    calculationType: String,
    formula: String,
    percentage: Number,
    monthlyAmount: { type: Number, required: true },
    annualAmount: { type: Number, required: true },
    resolved: { type: Boolean, default: true }
  }],

  // Employee deductions (PF employee, PT, TDS, etc.)
  employeeDeductions: [{
    name: { type: String, required: true },
    componentCode: String,
    category: String,
    amountType: String,
    formula: String,
    calculationBase: String,
    amountValue: Number,
    monthlyAmount: { type: Number, required: true },
    annualAmount: { type: Number, required: true },
    resolved: { type: Boolean, default: true }
  }],

  // Benefits (if any)
  benefits: [{
    name: String,
    code: String,
    annualAmount: Number,
    monthlyAmount: Number,
    formula: String,
    resolved: Boolean
  }],

  // Calculated breakdown
  breakdown: {
    grossA: { type: Number, default: 0 },
    grossB: { type: Number, default: 0 },
    grossC: { type: Number, default: 0 },
    takeHome: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 }
  },

  // When this snapshot becomes effective
  effectiveFrom: {
    type: Date,
    required: true,
    index: true
  },

  // Immutability lock
  locked: {
    type: Boolean,
    default: false,
    index: true
  },

  // Lock timestamp
  lockedAt: {
    type: Date
  },

  // Who locked it
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Reason for this snapshot (joining, increment, revision, promotion)
  reason: {
    type: String,
    enum: ['JOINING', 'INCREMENT', 'REVISION', 'PROMOTION', 'MANUAL', 'CORRECTION'],
    default: 'MANUAL'
  },

  // Reference to salary revision (if applicable)
  revisionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryRevision'
  },

  previousSnapshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeSalarySnapshot',
    default: null
  },

  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  snapshotVersion: {
    type: Number,
    default: 1,
    immutable: true
  },

  // Additional notes
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }

}, {
  versionKey: false,
  timestamps: false
});

// Compound indexes for efficient queries
EmployeeSalarySnapshotSchema.index({ employee: 1, effectiveFrom: -1 });
EmployeeSalarySnapshotSchema.index({ applicant: 1, effectiveFrom: -1 });
EmployeeSalarySnapshotSchema.index({ tenant: 1, employee: 1, locked: 1 });
EmployeeSalarySnapshotSchema.index({ tenant: 1, effectiveFrom: 1 });

// Prevent modification of locked snapshots
EmployeeSalarySnapshotSchema.pre('save', function (next) {
  if (this.isModified() && this.locked && !this.isNew) {
    return next(new Error('Cannot modify a locked salary snapshot'));
  }
  next();
});

module.exports = EmployeeSalarySnapshotSchema;