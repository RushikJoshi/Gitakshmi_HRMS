const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, index: true, unique: true, sparse: true },
  // domain: { type: String, default: null },       // optional custom domain
  emailDomain: { type: String, default: null },  // used to resolve tenant by login email
  plan: { type: String, default: 'free' },
  status: { type: String, enum: ['pending','active','suspended','deleted'], default: 'active' },
  modules: { type: [String], default: [] }, // enabled modules, e.g., ['hr','payroll','ess']
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // free-form tenant settings
  // Verification fields
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
