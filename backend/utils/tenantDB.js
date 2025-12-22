const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const { getTenantDB: getDbFromManager } = require('../config/dbManager');

/**
 * getTenantDB
 * Accepts either a tenant code (string) or a tenant _id (ObjectId/string).
 * Returns a mongoose Connection object for the tenant database using mongoose.connection.useDb
 * Uses the optimized dbManager for connection pooling and caching.
 */
module.exports = async function getTenantDB(tenantIdentifier) {
  if (!tenantIdentifier) throw new Error('tenantIdentifier required');

  let tenantId = tenantIdentifier;
  let code = tenantIdentifier;

  // If a code string was passed, try to resolve to tenant ID first
  // Otherwise use ID directly
  try {
    if (!mongoose.Types.ObjectId.isValid(String(tenantIdentifier))) {
      // Likely a code, not an ID - try to find the tenant
      const t = await Tenant.findOne({ code: tenantIdentifier }).lean();
      if (!t) {
        console.warn(`Tenant not found for code: ${tenantIdentifier}, using code as fallback`);
      } else {
        tenantId = t._id.toString();
        code = t.code;
      }
    } else {
      // It's a valid ObjectId, resolve to get the code
      const t = await Tenant.findById(tenantIdentifier).lean();
      if (t) {
        code = t.code;
      } else {
        console.warn(`Tenant not found for ID: ${tenantIdentifier}, using ID directly`);
      }
    }
  } catch (e) {
    console.error('Error resolving tenant:', e.message);
    // Continue with what we have
  }

  // Use the optimized dbManager for connection pooling
  return getDbFromManager(tenantId || code);
};
