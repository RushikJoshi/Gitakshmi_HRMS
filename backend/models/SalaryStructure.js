const mongoose = require('mongoose');

// { key, label, monthly, yearly }
const ComponentSchema = new mongoose.Schema({
  key: { type: String }, // Original ID or slug
  label: { type: String, required: true },
  monthly: { type: Number, default: 0 },
  yearly: { type: Number, default: 0 },
  type: { type: String, enum: ['earning', 'deduction', 'employer_benefit'], required: true },
  isSelected: { type: Boolean, default: true }
}, { _id: false });

const SalaryStructureSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Applicant',
    required: true,
    unique: true
  },
  calculationMode: {
    type: String,
    enum: ['AUTO', 'MANUAL'],
    default: 'AUTO'
  },

  earnings: [ComponentSchema],
  deductions: [ComponentSchema],
  employerBenefits: [ComponentSchema],

  totals: {
    grossEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    employerBenefits: { type: Number, default: 0 },
    monthlyCTC: { type: Number, default: 0 },
    annualCTC: { type: Number, default: 0 }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

SalaryStructureSchema.index({ tenantId: 1, candidateId: 1 });

module.exports = SalaryStructureSchema;
