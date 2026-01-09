// Immutable snapshot of an employee's salary at a point in time
const mongoose = require('mongoose');

const EmployeeSalarySnapshotSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  ctc: { type: Number, required: true },
  earnings: [{
    name: String,
    code: String,
    amount: Number,
    formula: String,
    resolved: Boolean
  }],
  deductions: [{
    name: String,
    code: String,
    amount: Number,
    formula: String,
    resolved: Boolean
  }],
  effectiveDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  snapshotVersion: { type: Number, default: 1, immutable: true }
}, { versionKey: false, timestamps: false });

EmployeeSalarySnapshotSchema.index({ employee: 1, effectiveDate: -1 });

module.exports = mongoose.model('EmployeeSalarySnapshot', EmployeeSalarySnapshotSchema);