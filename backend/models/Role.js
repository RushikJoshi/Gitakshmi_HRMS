const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  permissions: {
    type: [String],
    default: []
  },
  level: { type: Number, default: 0 }, // Hierarchy level (0 = CEO, 1 = HR Manager, 2 = Dept Head, etc.)
  meta: { type: Object, default: {} },
}, { timestamps: true });

// Ensure unique role title per tenant
RoleSchema.index({ tenant: 1, title: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = RoleSchema;

