const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  code: { type: String, trim: true, uppercase: true, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  description: { type: String, trim: true, maxlength: 250 },
  // optional parent department (Deprecated/Removed from UI)
  parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
  // optional head (Deprecated/Removed from UI)
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  // who created this department
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDefault: { type: Boolean, default: false },
  meta: { type: Object, default: {} },
}, { timestamps: true });

// ensure unique department name per tenant
DepartmentSchema.index({ tenant: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
// ensure unique department code per tenant
DepartmentSchema.index({ tenant: 1, code: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports =  DepartmentSchema;
 
