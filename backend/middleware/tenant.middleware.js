// middleware/tenant.middleware.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
// Use centralized tenant DB helper
const getTenantDB = require('../utils/tenantDB');

module.exports = async function tenantResolver(req, res, next) {
  try {
    // Defensive logging for debugging
    console.error(`[TENANT_MIDDLEWARE] ${req.method} ${req.path}`);

    // Skip tenant resolution for OPTIONS requests (CORS preflight) and Health Check
    if (req.method === 'OPTIONS' || req.path === '/api/health' || req.path === '/health') {
      return next();
    }

    // For public routes, try to get tenantId from header or URL param
    if (req.path.startsWith('/public/')) {
      const tenantId = req.headers["x-tenant-id"] || req.query.tenantId;
      if (tenantId) {
        req.tenantId = tenantId;
        // dbManager (called by getTenantDB) handles caching and model registration
        req.tenantDB = await getTenantDB(tenantId);
        return next();
      } else {
        return res.status(400).json({ error: "Tenant ID required for public routes" });
      }
    }

    // Try to read tenantId from already-populated req.user or from header
    let tenantId = req.user?.tenantId || req.user?.tenant || req.headers["x-tenant-id"];

    // If no req.user yet (middleware may run before auth middleware), try to extract tenantId from JWT
    if (!tenantId) {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
          const token = parts[1];
          try {
            const payload = jwt.verify(token, process.env.JWT_SECRET || "hrms_secret_key_123");
            tenantId = payload.tenantId || payload.tenant || tenantId;
            console.log(`[TENANT_MIDDLEWARE] Extracted tenantId from token: ${tenantId}`);
          } catch (e) {
            console.log(`[TENANT_MIDDLEWARE] Failed to verify token: ${e.message}`);
            // ignore invalid token here; auth middleware will handle auth failures
          }
        }
      }
    }

    req.tenantId = tenantId;

    // Skip tenant resolution for super admin
    if (req.user && req.user.role === 'psa') {
      console.log(`[TENANT_MIDDLEWARE] Skipping tenant resolution for super admin`);
      return next();
    }

    // If tenant ID not required for PSA routes or no tenant info found, continue
    if (!tenantId) {
      console.log(`[TENANT_MIDDLEWARE] No tenantId found, proceeding without tenantDB`);
      return next();
    }

    // 2️⃣ Get tenant-specific DB connection (helper resolves id->code if needed)
    console.log(`[TENANT_MIDDLEWARE] Getting tenant DB for tenantId: ${tenantId}`);

    // If tenantId is a CODE (not an ObjectId), we must resolve it to an ObjectId
    // because models (like Notification) reference tenant as ObjectId.
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      let Tenant;
      try {
        Tenant = mongoose.model('Tenant');
      } catch (e) {
        Tenant = require('../models/Tenant');
      }

      const t = await Tenant.findOne({ code: tenantId }).select('_id').lean();
      if (t) {
        req.tenantId = t._id.toString();
        console.log(`[TENANT_MIDDLEWARE] Resolved tenant code ${tenantId} to ID ${req.tenantId}`);
      } else {
        console.warn(`[TENANT_MIDDLEWARE] Could not resolve tenant code: ${tenantId}`);
      }
    }

    // dbManager (called by getTenantDB) handles caching and model registration
    req.tenantDB = await getTenantDB(tenantId);

    next();
  } catch (err) {
    console.error("Tenant resolve failed:", err);
    console.error("Error details:", err.message);
    if (err.stack) {
      console.error("Stack trace:", err.stack);
    }
    // Don't send response if headers already sent
    if (!res.headersSent) {
      res.status(400).json({
        error: "tenant_not_resolved",
        message: err.message || "Failed to resolve tenant database"
      });
    }
  }
};
