// backend/config/dbManager.js
const mongoose = require("mongoose");

/**
 * dbManager: provide per-tenant mongoose DB instance using mongoose.connection.useDb
 */

const tenantDbs = {};
const MAX_CACHED_CONNECTIONS = 50;
const connectionAccessTime = {};
const registeredModels = new Set(); // Track which tenant DBs have models registered

/**
 * Registers all tenant-specific models on a given database connection.
 */
function registerModels(db, tenantId) {
  if (registeredModels.has(tenantId)) return;

  try {
    db.model("Employee", require("../models/Employee"));
    db.model("Department", require("../models/Department"));
    db.model("LeaveRequest", require("../models/LeaveRequest"));
    db.model("Attendance", require("../models/Attendance"));
    db.model("Activity", require("../models/Activity"));
    db.model("User", require("../models/User"));
    db.model("Requirement", require("../models/Requirement"));
    db.model("Applicant", require("../models/Applicant"));
    db.model("OfferLetterTemplate", require("../models/OfferLetterTemplate"));
    db.model("LeavePolicy", require("../models/LeavePolicy"));
    db.model("LeaveBalance", require("../models/LeaveBalance"));
    db.model("Notification", require("../models/Notification"));
    db.model("Regularization", require("../models/Regularization"));
    db.model("AuditLog", require("../models/AuditLog"));
    db.model("Comment", require("../models/Comment"));
    db.model("AccessControl", require("../models/AccessControl"));
    db.model("Role", require("../models/Role"));
    db.model("Holiday", require("../models/Holiday"));
    db.model("AttendanceSettings", require("../models/AttendanceSettings"));

    registeredModels.add(tenantId);

    console.log(`Models registered for tenant: ${tenantId}`);
  } catch (err) {
    if (err.message && err.message.includes('already registered')) {
      registeredModels.add(tenantId);
    } else {
      console.error(`Model registration failed for tenant ${tenantId}:`, err);
    }
  }
}

/**
 * Returns a mongoose.Connection-like object for the tenant database.
 * @param {string} tenantId
 * @returns mongoose.Connection (db instance)
 */
function getTenantDB(tenantId) {
  if (!tenantId) throw new Error("tenantId required for getTenantDB");

  connectionAccessTime[tenantId] = Date.now();

  if (tenantDbs[tenantId]) {
    // Ensure models are registered even if retrieving from cache
    registerModels(tenantDbs[tenantId], tenantId);
    return tenantDbs[tenantId];
  }

  const cachedCount = Object.keys(tenantDbs).length;
  if (cachedCount >= MAX_CACHED_CONNECTIONS) {
    let lruTenantId = null;
    let oldestTime = Date.now();
    for (const tid in connectionAccessTime) {
      if (connectionAccessTime[tid] < oldestTime && tid !== tenantId) {
        lruTenantId = tid;
        oldestTime = connectionAccessTime[tid];
      }
    }
    if (lruTenantId) {
      delete tenantDbs[lruTenantId];
      delete connectionAccessTime[lruTenantId];
      registeredModels.delete(lruTenantId);
    }
  }

  const dbName = `company_${tenantId}`;
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });

  // Register models immediately
  registerModels(tenantDb, tenantId);

  tenantDbs[tenantId] = tenantDb;
  console.log(`Tenant DB prepared: ${dbName}`);
  return tenantDb;
}

function clearCache() {
  Object.keys(tenantDbs).forEach(key => {
    delete tenantDbs[key];
    delete connectionAccessTime[key];
    registeredModels.delete(key);
  });
}

module.exports = { getTenantDB, clearCache };

