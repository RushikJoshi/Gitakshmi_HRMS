// middleware/tenant.middleware.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
// Use centralized tenant DB helper (which now handles model registration)
const getTenantDB = require('../utils/tenantDB');

module.exports = async function tenantResolver(req, res, next) {
  try {
    // Skip tenant resolution for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    // For public routes, try to get tenantId from header or URL param
    if (req.path.startsWith('/public/')) {
      const tenantId = req.headers["x-tenant-id"] || req.query.tenantId;
      if (tenantId) {
        req.tenantId = tenantId;
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
          } catch (e) {
            // ignore invalid token here; auth middleware will handle auth failures
          }
        }
      }
    }

    req.tenantId = tenantId;

    // If tenant ID not required for PSA routes or no tenant info found, continue
    if (!tenantId) return next();

    // 2️⃣ Get tenant-specific DB connection (model registration is automatic inside getTenantDB)
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

