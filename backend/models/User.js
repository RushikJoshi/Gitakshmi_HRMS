const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure unique email per tenant
UserSchema.index({ tenant: 1, email: 1 }, { unique: true });

// Multi-tenant fix: Export ONLY Schema
module.exports = UserSchema;
