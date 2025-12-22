const Tenant = require("../models/Tenant");
const CounterSchema = require("../models/Counter");
const EmployeeSchema = require("../models/Employee");
const mongoose = require("mongoose");

// Global counter model (stored in main connection, not tenant databases)
let GlobalCounter;
function getGlobalCounter() {
  if (!GlobalCounter) {
    try {
      GlobalCounter = mongoose.model("GlobalCounter");
    } catch (e) {
      GlobalCounter = mongoose.model("GlobalCounter", CounterSchema);
    }
  }
  return GlobalCounter;
}

/* ---------------------------------------------
   HELPER → Get model from tenantDB
--------------------------------------------- */
function getModels(req) {
  if (!req.tenantDB) {
    throw new Error("Tenant database connection not available");
  }
  const db = req.tenantDB;
  try {
    return {
      Employee: db.model("Employee", EmployeeSchema),
      LeavePolicy: db.model("LeavePolicy"),
      LeaveBalance: db.model("LeaveBalance")
      // Counter is now global, not per-tenant
    };
  } catch (err) {
    console.error("Error in getModels:", err);
    throw err;
  }
}

/* ---------------------------------------------
   HELPER: Get next sequence per-tenant (using global counter)
--------------------------------------------- */
async function getNextSeq(key) {
  const Counter = getGlobalCounter();
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

/* ---------------------------------------------
   EMPLOYEE ID FORMATTER
--------------------------------------------- */
async function generateEmployeeId({ req, tenantId, format, digits, department, firstName, lastName }) {
  const tenant = await Tenant.findById(tenantId).lean();
  const prefix = (tenant?.code || tenant?.name?.slice(0, 3) || "CMP").toUpperCase();
  const dep = (department || "GEN").toUpperCase();
  const pad = (n) => String(n).padStart(digits, "0");

  const initials =
    ((firstName?.[0] || "").toUpperCase()) +
    ((lastName?.[0] || "").toUpperCase());

  let key, seq, empId;

  switch (format) {
    case "COMP_NUM":
      key = `${tenantId}:GLOBAL`;
      seq = await getNextSeq(key);
      empId = `${prefix}-${pad(seq)}`;
      break;

    case "COMP_DEPT_NUM":
      key = `${tenantId}:DEPT:${dep}`;
      seq = await getNextSeq(key);
      empId = `${prefix}-${dep}-${pad(seq)}`;
      break;

    case "INIT_NUM":
      key = `${tenantId}:INIT:${initials}`;
      seq = await getNextSeq(key);
      empId = `${initials}-${pad(seq)}`;
      break;

    case "COMP_INIT_NUM":
      key = `${tenantId}:INIT:${initials}`;
      seq = await getNextSeq(key);
      empId = `${prefix}-${initials}-${pad(seq)}`;
      break;

    case "NUM_ONLY":
    default:
      key = `${tenantId}:GLOBAL`;
      seq = await getNextSeq(key);
      empId = `${pad(seq)}`;
  }

  return empId;
}

async function initializeBalances(req, employeeId, policyId) {
  if (!policyId) return;
  const { LeavePolicy, LeaveBalance } = getModels(req);
  const policy = await LeavePolicy.findOne({ _id: policyId, tenant: req.tenantId });
  if (!policy) return;

  const year = new Date().getFullYear();
  await LeaveBalance.deleteMany({ employee: employeeId, year });

  const balancePromises = policy.rules.map(rule => {
    return new LeaveBalance({
      tenant: req.tenantId,
      employee: employeeId,
      policy: policyId,
      leaveType: rule.leaveType,
      year,
      total: rule.totalPerYear
    }).save();
  });
  await Promise.all(balancePromises);
}

/* ---------------------------------------------
   PREVIEW ID (Does NOT increase counter)
--------------------------------------------- */
exports.preview = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const tenant = await Tenant.findById(tenantId);

    const digits = tenant?.meta?.empCodeDigits || 3;
    const format = tenant?.meta?.empCodeFormat || "COMP_DEPT_NUM";
    const { department, firstName, lastName } = req.body;

    const dep = (department || "GEN").toUpperCase();
    const prefix = (tenant?.code || tenant?.name?.slice(0, 3)).toUpperCase();
    const initials =
      (firstName?.[0] || "").toUpperCase() +
      (lastName?.[0] || "").toUpperCase();

    const pad = (n) => String(n).padStart(digits, "0");

    const Counter = getGlobalCounter();

    let key;

    switch (format) {
      case "COMP_NUM": key = `${tenantId}:GLOBAL`; break;
      case "COMP_DEPT_NUM": key = `${tenantId}:DEPT:${dep}`; break;
      case "INIT_NUM": key = `${tenantId}:INIT:${initials}`; break;
      case "COMP_INIT_NUM": key = `${tenantId}:INIT:${initials}`; break;
      default: key = `${tenantId}:GLOBAL`;
    }

    const current = await Counter.findOne({ key });
    const next = (current?.seq || 0) + 1;

    let preview;

    switch (format) {
      case "COMP_NUM": preview = `${prefix}-${pad(next)}`; break;
      case "COMP_DEPT_NUM": preview = `${prefix}-${dep}-${pad(next)}`; break;
      case "INIT_NUM": preview = `${initials}-${pad(next)}`; break;
      case "COMP_INIT_NUM": preview = `${prefix}-${initials}-${pad(next)}`; break;
      case "NUM_ONLY": preview = `${pad(next)}`; break;
    }

    res.json({ preview });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "preview_failed" });
  }
};

/* ---------------------------------------------
   LIST EMPLOYEES (tenant-wise)
--------------------------------------------- */
exports.list = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const { department } = req.query || {};
    const filter = { tenant: tenantId };
    if (department) {
      filter.department = department;
    }

    // Default to hiding drafts unless specifically asked for
    if (!req.query.status) {
      filter.status = { $ne: 'Draft' };
    } else {
      filter.status = req.query.status;
    }

    const items = await Employee.find(filter)
      .select("_id firstName lastName middleName email department departmentId role manager employeeId contactNo joiningDate profilePic status lastStep gender dob maritalStatus bloodGroup nationality fatherName motherName emergencyContactName emergencyContactNumber tempAddress permAddress experience jobType bankDetails education documents")
      .populate('departmentId', 'name')
      .populate('manager', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: items });
  } catch (err) {
    console.error("LIST ERROR:", err);
    res.status(500).json({ success: false, error: "list_failed", details: err.message });
  }
};

/* ---------------------------------------------
   CREATE EMPLOYEE
--------------------------------------------- */
exports.create = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { Employee } = getModels(req);
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(400).json({
        success: false,
        error: "tenant_not_found",
        message: "Tenant not found"
      });
    }

    const digits = tenant?.meta?.empCodeDigits || 3;
    const format = tenant?.meta?.empCodeFormat || "COMP_DEPT_NUM";
    const allowOverride = tenant?.meta?.empCodeAllowOverride || false;

    const { firstName, lastName, department, customEmployeeId, departmentId, joiningDate, status, lastStep, ...restBody } = req.body;

    let finalEmployeeId;

    if (customEmployeeId && allowOverride) {
      const exists = await Employee.findOne({ employeeId: customEmployeeId });
      if (exists)
        return res.status(400).json({
          success: false,
          error: "employeeId_exists",
          message: "Employee ID already in use"
        });

      finalEmployeeId = customEmployeeId;

    } else {
      finalEmployeeId = await generateEmployeeId({
        req,
        tenantId,
        format,
        digits,
        department,
        firstName,
        lastName
      });
    }

    // Build create data with proper departmentId and joiningDate handling
    const createData = {
      ...restBody,
      firstName,
      lastName,
      employeeId: finalEmployeeId,
      tenant: tenantId,
      status: status || 'Active',
      lastStep: lastStep || 6
    };

    if (departmentId) {
      createData.departmentId = departmentId;
    }
    if (department) {
      createData.department = department;
    }
    if (joiningDate) {
      createData.joiningDate = new Date(joiningDate);
    } else {
      createData.joiningDate = new Date(); // Default to now
    }

    const emp = await Employee.create(createData);

    // Initialize Leave Balances if policy provided
    if (restBody.leavePolicy) {
      try {
        await initializeBalances(req, emp._id, restBody.leavePolicy);
      } catch (balErr) {
        console.error("Failed to initialize balances:", balErr);
      }
    }

    res.json({ success: true, data: emp });

  } catch (err) {
    console.error('Employee create error:', err);

    // Duplicate employeeId or other unique index issues
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        error: "employee_duplicate",
        message: `Employee with this ${field} already exists.`
      });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      const details = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({
        success: false,
        error: "validation_failed",
        message: details || "Employee validation failed."
      });
    }

    res.status(500).json({
      success: false,
      error: "create_failed",
      message: err.message || "Failed to create employee",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/* ---------------------------------------------
   GET EMPLOYEE
--------------------------------------------- */
exports.get = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    const emp = await Employee.findOne({ _id: req.params.id, tenant: tenantId });
    if (!emp) return res.status(404).json({ error: "not_found" });

    res.json(emp);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "get_failed" });
  }
};

/* ---------------------------------------------
   CURRENT LOGGED-IN EMPLOYEE
--------------------------------------------- */
exports.me = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user?.id;

    const emp = await Employee.findOne({ _id: userId, tenant: tenantId });

    if (!emp) return res.status(404).json({ error: "not_found" });

    res.json(emp);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "me_failed" });
  }
};

/* ---------------------------------------------
   UPDATE EMPLOYEE
--------------------------------------------- */
exports.update = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    const updatePayload = { ...req.body };
    delete updatePayload.employeeId;
    delete updatePayload.tenant;

    // Handle joiningDate conversion if provided
    if (updatePayload.joiningDate) {
      updatePayload.joiningDate = new Date(updatePayload.joiningDate);
    }

    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, tenant: tenantId },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!emp) return res.status(404).json({ error: "not_found", message: "Employee not found" });

    res.json({ success: true, data: emp });

    // Re-initialize balances if policy changed
    if (req.body.leavePolicy) {
      try {
        await initializeBalances(req, emp._id, req.body.leavePolicy);
      } catch (balErr) {
        console.error("Failed to re-initialize balances:", balErr);
      }
    }

  } catch (err) {
    console.error('Employee update error:', err);

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      const details = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({
        success: false,
        error: "validation_failed",
        message: details || "Employee validation failed."
      });
    }

    // Duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "employee_duplicate",
        message: "Employee with this unique field already exists."
      });
    }

    res.status(500).json({
      success: false,
      error: "update_failed",
      message: err.message || "Failed to update employee"
    });
  }
};

/* ---------------------------------------------
   DELETE EMPLOYEE
--------------------------------------------- */
exports.remove = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      tenant: tenantId
    });

    if (!emp)
      return res.status(404).json({ error: "not_found" });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "delete_failed" });
  }
};

/* ---------------------------------------------
   ORG / REPORTING: Set manager, list direct reports, reporting chain, org tree
   IMPROVED: Better validation, cycle prevention, tenant checks, optimized queries
--------------------------------------------- */

/**
 * SET MANAGER - Improved with comprehensive validation
 * - Prevents self-assignment
 * - Prevents circular chains
 * - Validates tenant match
 * - Optimized queries with lean() and projection
 */
exports.setManager = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;
    const { managerId } = req.body; // may be null to clear manager

    // Validate id formats early to avoid cast errors
    const ObjectId = mongoose.Types.ObjectId;
    if (!ObjectId.isValid(empId)) {
      console.warn(`setManager: invalid employee id received: ${empId}`);
      return res.status(400).json({ error: 'invalid_employee_id', message: 'Invalid employee id' });
    }
    if (managerId && managerId !== null && managerId !== '') {
      if (!ObjectId.isValid(managerId)) {
        console.warn(`setManager: invalid manager id received: ${managerId}`);
        return res.status(400).json({ error: 'invalid_manager_id', message: 'Invalid manager id' });
      }
    }

    // Validation 1: Prevent employee from becoming their own manager
    if (managerId && String(managerId) === String(empId)) {
      return res.status(400).json({ error: 'cannot_set_self_manager', message: 'Employee cannot be their own manager' });
    }

    // Get employee with minimal projection for performance
    const emp = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('_id manager tenant department role')
      .lean();

    if (!emp) {
      return res.status(404).json({ error: 'employee_not_found', message: 'Employee not found' });
    }

    // If clearing manager (setting to null)
    if (!managerId || managerId === null || managerId === '') {
      await Employee.updateOne(
        { _id: empId, tenant: tenantId },
        { $set: { manager: null } }
      );

      // Return updated employee with full details
      const updated = await Employee.findOne({ _id: empId, tenant: tenantId })
        .select('-password')
        .lean();

      return res.json({
        success: true,
        employee: updated,
        message: 'Manager removed successfully'
      });
    }

    // Validation 2: Manager must exist and be from same tenant
    const mgr = await Employee.findOne({ _id: managerId, tenant: tenantId })
      .select('_id manager tenant department role')
      .lean();

    if (!mgr) {
      return res.status(404).json({
        error: 'manager_not_found',
        message: 'Manager not found or belongs to different tenant'
      });
    }

    // Validation 3: Prevent circular management chain
    // Walk up the manager's chain to ensure we don't create a cycle
    const visited = new Set([String(empId)]); // Track visited nodes to prevent cycles
    let current = mgr;
    const MAX_DEPTH = 1000; // Safety limit for very deep hierarchies
    let depth = 0;

    while (current && current.manager) {
      const currentManagerId = String(current.manager);

      // If we encounter the employee in the manager's chain, it's a cycle
      if (visited.has(currentManagerId)) {
        return res.status(400).json({
          error: 'cycle_detected',
          message: 'This assignment would create a circular management chain'
        });
      }

      visited.add(currentManagerId);

      // If the manager's manager is the employee, it's a cycle
      if (currentManagerId === String(empId)) {
        return res.status(400).json({
          error: 'cycle_detected',
          message: 'This assignment would create a circular management chain'
        });
      }

      // Get next manager in chain
      current = await Employee.findOne({ _id: current.manager, tenant: tenantId })
        .select('_id manager')
        .lean();

      depth++;
      if (depth > MAX_DEPTH) {
        console.warn('Max depth reached while checking for cycles');
        break;
      }
    }

    // Validation 4: Manager/Department check
    // NOTE: previously we rejected assignments where employee and manager had different department values.
    // That constraint caused many valid assignments to fail when departments are stored as names/codes or when
    // managers span departments. Relaxing to WARN only — we keep the check logged for diagnostics.
    try {
      if (emp.department && mgr.department && String(emp.department) !== String(mgr.department)) {
        console.warn(`setManager: department mismatch for emp=${empId} (empDept=${emp.department}) vs mgr=${managerId} (mgrDept=${mgr.department}). Allowing assignment.`);
      }
    } catch (e) {
      // Defensive: if dept fields are unexpected, don't block the operation
      console.warn('setManager: department comparison failed', e && e.message);
    }

    // Debug log: input summary (helpful when reproducing client 400/500)
    console.debug(`setManager: emp=${empId} manager=${managerId} tenant=${tenantId}`);

    // All validations passed - update manager
    await Employee.updateOne(
      { _id: empId, tenant: tenantId },
      { $set: { manager: managerId } }
    );

    // Return updated employee with populated manager details
    const updated = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('-password')
      .populate('manager', 'firstName lastName employeeId role department')
      .lean();

    res.json({
      success: true,
      employee: updated,
      message: 'Manager assigned successfully'
    });

  } catch (err) {
    console.error('setManager error:', err);
    res.status(500).json({ error: 'set_manager_failed', message: err.message });
  }
};

/**
 * REMOVE MANAGER - Dedicated endpoint to clear manager
 */
exports.removeManager = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;

    const emp = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('_id manager')
      .lean();

    if (!emp) {
      return res.status(404).json({ error: 'employee_not_found' });
    }

    await Employee.updateOne(
      { _id: empId, tenant: tenantId },
      { $set: { manager: null } }
    );

    const updated = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('-password')
      .lean();

    res.json({
      success: true,
      employee: updated,
      message: 'Manager removed successfully'
    });

  } catch (err) {
    console.error('removeManager error:', err);
    res.status(500).json({ error: 'remove_manager_failed', message: err.message });
  }
};

/**
 * GET DIRECT REPORTS - Optimized with projection
 */
exports.directReports = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const managerId = req.params.id;

    // Optimized query with projection - only fetch needed fields
    const items = await Employee.find({ tenant: tenantId, manager: managerId })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.json(items);
  } catch (err) {
    console.error('directReports error:', err);
    res.status(500).json({ error: 'direct_reports_failed', message: err.message });
  }
};

/**
 * GET MANAGER - Optimized with projection
 */
exports.getManager = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;

    const emp = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('manager')
      .populate('manager', 'firstName lastName employeeId role department email profilePic')
      .lean();

    if (!emp) {
      return res.status(404).json({ error: 'not_found', message: 'Employee not found' });
    }

    res.json(emp.manager || null);
  } catch (err) {
    console.error('getManager error:', err);
    res.status(500).json({ error: 'get_manager_failed', message: err.message });
  }
};

/**
 * GET REPORTING CHAIN - Walk up the management chain
 * Optimized: Uses projection and handles null managers gracefully
 */
exports.reportingChain = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;

    const chain = [];
    const visited = new Set(); // Prevent infinite loops
    let current = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('manager')
      .lean();

    if (!current) {
      return res.status(404).json({ error: 'not_found', message: 'Employee not found' });
    }

    const MAX_DEPTH = 200;
    let depth = 0;

    // Walk up the chain
    while (current && current.manager) {
      const managerId = String(current.manager);

      // Prevent infinite loops
      if (visited.has(managerId)) {
        console.warn('Circular reference detected in reporting chain');
        break;
      }
      visited.add(managerId);

      // Get manager details with optimized projection
      const mgr = await Employee.findOne({ _id: managerId, tenant: tenantId })
        .select('firstName lastName employeeId role department email profilePic manager')
        .lean();

      if (!mgr) break;

      chain.push(mgr);
      current = mgr;
      depth++;

      if (depth > MAX_DEPTH) {
        console.warn('Max depth reached in reporting chain');
        break;
      }
    }

    res.json(chain);
  } catch (err) {
    console.error('reportingChain error:', err);
    res.status(500).json({ error: 'reporting_chain_failed', message: err.message });
  }
};

/**
 * BUILD SUBTREE - Optimized recursive function for org tree
 * - Uses lean() for performance
 * - Uses projection to fetch only needed fields
 * - Handles null managers gracefully
 * - Prevents infinite recursion
 */
async function buildSubtree(Employee, tenantId, empId, depthLeft, visited = new Set()) {
  // Prevent infinite recursion
  const empIdStr = String(empId);
  if (visited.has(empIdStr)) {
    console.warn(`Circular reference detected for employee ${empIdStr}`);
    return [];
  }
  visited.add(empIdStr);

  // Base case: depth limit reached
  if (depthLeft <= 0) {
    // Still fetch direct reports but mark as leaf nodes
    const subs = await Employee.find({ tenant: tenantId, manager: empId })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    return subs.map(s => ({ ...s, reports: [] }));
  }

  // Fetch direct reports with optimized projection
  const subs = await Employee.find({ tenant: tenantId, manager: empId })
    .select('firstName lastName employeeId role department email profilePic')
    .sort({ firstName: 1, lastName: 1 })
    .lean();

  if (!subs || subs.length === 0) {
    return [];
  }

  // Recursively build subtree for each direct report
  const results = [];
  for (const sub of subs) {
    const reports = await buildSubtree(Employee, tenantId, sub._id, depthLeft - 1, new Set(visited));
    results.push({ ...sub, reports });
  }

  return results;
}

/**
 * GET ORG TREE - Get organizational tree starting from a specific employee
 * Improved: Better error handling, optimized queries, null manager handling
 */
exports.orgTree = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;
    const depth = Math.min(parseInt(req.query.depth || '5', 10), 20); // Cap at 20 for performance

    // Get root employee with optimized projection
    const root = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('firstName lastName employeeId role department email profilePic manager')
      .lean();

    if (!root) {
      return res.status(404).json({ error: 'not_found', message: 'Employee not found' });
    }

    // Build subtree recursively
    const reports = await buildSubtree(Employee, tenantId, root._id, depth);

    res.json({
      root,
      reports,
      depth: depth,
      totalReports: reports.length
    });
  } catch (err) {
    console.error('orgTree error:', err);
    res.status(500).json({ error: 'org_tree_failed', message: err.message });
  }
};

exports.getOrgRoot = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });
    const rootId = tenant?.meta?.orgRootEmployeeId || null;
    if (!rootId) return res.json(null);
    const { Employee } = getModels(req);
    const emp = await Employee.findOne({ _id: rootId, tenant: tenantId }).select('-password').lean();
    res.json(emp || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'get_org_root_failed' });
  }
};

exports.setOrgRoot = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { employeeId } = req.body;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });
    const { Employee } = getModels(req);
    const emp = await Employee.findOne({ _id: employeeId, tenant: tenantId }).select('-password');
    if (!emp) return res.status(404).json({ error: 'employee_not_found' });
    tenant.meta = tenant.meta || {};
    tenant.meta.orgRootEmployeeId = String(emp._id);
    await tenant.save();
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'set_org_root_failed' });
  }
};

/**
 * GET COMPANY ORG TREE - Get full company organizational tree from root
 * Improved: Better error handling, fallback to top-level employees if root not set
 */
exports.companyOrgTree = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const depth = Math.min(parseInt(req.query.depth || '10', 10), 20); // Cap at 20
    const { Employee } = getModels(req);

    // Try to get org root from tenant meta
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      return res.status(404).json({ error: 'tenant_not_found', message: 'Tenant not found' });
    }

    const rootId = tenant?.meta?.orgRootEmployeeId || null;

    // If root is set, use it
    if (rootId) {
      const root = await Employee.findOne({ _id: rootId, tenant: tenantId })
        .select('firstName lastName employeeId role department email profilePic')
        .lean();

      if (root) {
        const reports = await buildSubtree(Employee, tenantId, root._id, depth);
        return res.json({
          root,
          reports,
          depth: depth,
          totalReports: reports.length,
          source: 'org_root'
        });
      }
    }

    // Fallback: Get all top-level employees (no manager)
    const topLevelEmployees = await Employee.find({
      tenant: tenantId,
      manager: null
    })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    if (topLevelEmployees.length === 0) {
      return res.status(404).json({
        error: 'org_root_not_set',
        message: 'No organizational root set and no top-level employees found'
      });
    }

    // Build trees for all top-level employees
    const allReports = [];
    for (const topLevel of topLevelEmployees) {
      const reports = await buildSubtree(Employee, tenantId, topLevel._id, depth);
      allReports.push({ ...topLevel, reports });
    }

    res.json({
      root: null, // Multiple roots
      roots: topLevelEmployees,
      reports: allReports,
      depth: depth,
      totalReports: allReports.reduce((sum, r) => sum + r.reports.length, 0),
      source: 'top_level_employees'
    });

  } catch (err) {
    console.error('companyOrgTree error:', err);
    res.status(500).json({ error: 'company_org_tree_failed', message: err.message });
  }
};

/**
 * GET TOP-LEVEL EMPLOYEES - Employees with no manager (CEO/Founders)
 * New endpoint for better UX
 */
exports.getTopLevelEmployees = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    // Get all employees with no manager (top-level)
    const topLevel = await Employee.find({
      tenant: tenantId,
      manager: null
    })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.json({
      employees: topLevel,
      count: topLevel.length
    });
  } catch (err) {
    console.error('getTopLevelEmployees error:', err);
    res.status(500).json({ error: 'get_top_level_failed', message: err.message });
  }
};

/* ---------------------------------------------
   GET FULL HIERARCHY (CEO → HR → Employees)
   Returns complete nested structure
   IMPROVED: Optimized queries, better null handling, depth limiting
--------------------------------------------- */
exports.getHierarchy = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    // Safe depth parsing: default 10, min 1, max 20
    const depth = Math.min(Math.max(parseInt(req.query.depth || '10', 10) || 10, 1), 20);

    // Validate tenantId
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_missing',
        message: 'Tenant not resolved for request'
      });
    }

    // Ensure tenantDB is available
    if (!req.tenantDB) {
      try {
        const getTenantDB = require('../utils/tenantDB');
        req.tenantDB = await getTenantDB(tenantId);
        if (req.tenantDB) {
          const EmployeeSchema = require('../models/Employee');
          try {
            req.tenantDB.model('Employee', EmployeeSchema);
          } catch (e) {
            // Model may already be registered
          }
        }
      } catch (e) {
        console.error('getHierarchy: failed to get tenantDB', e.message);
        return res.status(500).json({
          success: false,
          error: 'tenant_db_missing',
          message: 'Tenant database connection not available'
        });
      }
    }

    // Get Employee model
    let Employee;
    try {
      const models = getModels(req);
      Employee = models.Employee;
      if (!Employee || typeof Employee.aggregate !== 'function') {
        throw new Error('Employee model is not properly initialized');
      }
    } catch (e) {
      console.error('getHierarchy: failed to get models', e.message);
      return res.status(500).json({
        success: false,
        error: 'model_error',
        message: 'Failed to load employee model'
      });
    }

    // Normalize tenantId to string for queries
    const tenantIdStr = typeof tenantId === 'string' ? tenantId : tenantId.toString();

    // Use MongoDB aggregation with $graphLookup for safe hierarchy building
    try {
      // First, get all employees to build hierarchy manually (more reliable than $graphLookup with tenant filtering)
      const allEmployees = await Employee.find({ tenant: tenantIdStr })
        .select('firstName lastName employeeId role department departmentId email profilePic manager')
        .lean();

      // Handle empty result
      if (!allEmployees || allEmployees.length === 0) {
        return res.json({
          success: true,
          hierarchy: [],
          stats: {
            total: 0,
            roots: 0,
            withManager: 0,
            withoutManager: 0,
            inTree: 0
          }
        });
      }

      // Helper: safe manager ID extraction
      const getManagerId = (emp) => {
        if (!emp || !emp.manager) return null;
        if (typeof emp.manager === 'string') return emp.manager;
        if (emp.manager && emp.manager._id) return String(emp.manager._id);
        if (emp.manager && typeof emp.manager.toString === 'function') return String(emp.manager);
        return null;
      };

      // Build employee map
      const employeeMap = new Map();
      allEmployees.forEach(emp => {
        if (!emp || !emp._id) return;
        const empId = String(emp._id);
        employeeMap.set(empId, {
          _id: emp._id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          employeeId: emp.employeeId || '',
          role: emp.role || '',
          department: emp.department || '',
          departmentId: emp.departmentId || null,
          email: emp.email || '',
          profilePic: emp.profilePic || null,
          manager: getManagerId(emp),
          subordinates: []
        });
      });

      // Build hierarchy tree
      const roots = [];
      employeeMap.forEach((emp, empId) => {
        const managerId = emp.manager;

        // Null checks: if no manager or manager is self, it's a root
        if (!managerId || managerId === empId || managerId === '') {
          roots.push(emp);
          return;
        }

        // Try to find manager in map
        const manager = employeeMap.get(managerId);
        if (manager) {
          // Add to manager's subordinates (avoid duplicates)
          if (!manager.subordinates.some(sub => String(sub._id) === empId)) {
            manager.subordinates.push(emp);
          }
        } else {
          // Manager not found (orphaned), treat as root
          roots.push(emp);
        }
      });

      // Limit depth recursively
      function limitDepth(node, currentDepth, visited = new Set()) {
        const id = String(node._id);
        if (visited.has(id)) return; // Cycle detected
        visited.add(id);

        if (currentDepth >= depth) {
          node.subordinates = [];
          return;
        }

        if (node.subordinates && node.subordinates.length > 0) {
          node.subordinates.forEach(sub => limitDepth(sub, currentDepth + 1, new Set(visited)));
        }
      }

      roots.forEach(root => limitDepth(root, 0));

      // Count employees in tree
      function countInTree(node, visited = new Set()) {
        const id = String(node._id);
        if (visited.has(id)) return 0;
        visited.add(id);
        let count = 1;
        if (node.subordinates && node.subordinates.length > 0) {
          node.subordinates.forEach(sub => {
            count += countInTree(sub, new Set(visited));
          });
        }
        return count;
      }

      const totalInTree = roots.reduce((sum, root) => sum + countInTree(root), 0);
      const withManager = allEmployees.filter(e => {
        const mgrId = getManagerId(e);
        return mgrId && mgrId !== String(e._id) && mgrId !== '';
      }).length;

      return res.json({
        success: true,
        hierarchy: roots,
        stats: {
          total: allEmployees.length,
          roots: roots.length,
          withManager: withManager,
          withoutManager: allEmployees.length - withManager,
          inTree: totalInTree
        }
      });

    } catch (dbError) {
      console.error('getHierarchy: database query error', dbError);
      console.error('Error:', dbError.message);
      if (dbError.stack) console.error('Stack:', dbError.stack);

      // Fallback: return empty hierarchy on error
      return res.json({
        success: true,
        hierarchy: [],
        stats: {
          total: 0,
          roots: 0,
          withManager: 0,
          withoutManager: 0,
          inTree: 0
        }
      });
    }

  } catch (err) {
    console.error('getHierarchy: unexpected error', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.stack) {
      console.error('Error stack:', err.stack);
    }

    return res.status(500).json({
      success: false,
      error: 'hierarchy_failed',
      message: err.message || 'Unknown error occurred while building hierarchy'
    });
  }
};