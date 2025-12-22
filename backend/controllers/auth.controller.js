const jwt = require("jsonwebtoken");
const Tenant = require("../models/Tenant");
const getTenantDB = require('../utils/tenantDB');
const bcrypt = require("bcryptjs");

/* ---------------------------------------------------
   SUPER ADMIN LOGIN
--------------------------------------------------- */
const SUPER_ADMIN = {
  email: "superadmin@hrms.com",
  password: "admin123",
  role: "psa",
  name: "Super Admin",
};

exports.loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== SUPER_ADMIN.email || password !== SUPER_ADMIN.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: 'psa_admin', email: SUPER_ADMIN.email, role: SUPER_ADMIN.role },
      process.env.JWT_SECRET || "hrms_secret_key_123",
      { expiresIn: "1d" }
    );


    return res.json({
      token,
      user: {
        name: SUPER_ADMIN.name,
        email: SUPER_ADMIN.email,
        role: SUPER_ADMIN.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------------------------------
   HR LOGIN (PER TENANT)
--------------------------------------------------- */
exports.loginHrController = async (req, res) => {
  try {
    const { companyCode, email, password } = req.body;

    if (!companyCode || !email || !password) {
      return res.status(400).json({ message: "companyCode_email_password_required" });
    }

    const tenant = await Tenant.findOne({ code: companyCode });
    if (!tenant) return res.status(404).json({ message: "tenant_not_found" });
    if (tenant.status !== "active") return res.status(403).json({ message: "tenant_not_active" });

    const meta = tenant.meta || {};

    // normalize for comparison (trim + case-insensitive email)
    // support either `meta.email` or `meta.primaryEmail` (frontend uses primaryEmail)
    const storedEmail = String(meta.email || meta.primaryEmail || '').trim().toLowerCase();
    const storedPassword = String(meta.adminPassword || '').trim();
    const incomingEmail = String(email || '').trim().toLowerCase();
    const incomingPassword = String(password || '').trim();

    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, '../DEBUG_LOGIN.log');

    const logData = [
      `--- DEBUG HR LOGIN [${new Date().toISOString()}] ---`,
      `Company Code: ${companyCode}`,
      `Tenant Found: ${!!tenant}`,
      `Stored Email: ${storedEmail}`,
      `Incoming Email: ${incomingEmail}`,
      `Stored Password: ${storedPassword}`,
      `Incoming Password: ${incomingPassword}`,
      `Match Email: ${storedEmail === incomingEmail}`,
      `Match Password: ${storedPassword === incomingPassword}`,
      '----------------------\n'
    ].join('\n');

    try { fs.appendFileSync(logFile, logData); } catch (e) { }

    if (storedEmail !== incomingEmail || storedPassword !== incomingPassword) {
      // console.warn(`HR login failed for companyCode=${companyCode} email=${incomingEmail} (storedEmail=${storedEmail})`);
      return res.status(401).json({ message: 'invalid_credentials' });
    }

    const token = jwt.sign(
      {
        id: tenant._id,
        email: meta.email,
        role: "hr",
        companyCode: tenant.code,
        tenantId: tenant._id,
      },
      process.env.JWT_SECRET || "hrms_secret_key_123",
      { expiresIn: "1d" }
    );


    return res.json({
      token,
      user: {
        name: meta.ownerName || tenant.name || "Tenant Admin",
        email: meta.email,
        role: "hr",
        companyCode: tenant.code,
        tenantId: tenant._id,
      },
    });
  } catch (err) {
    console.error("HR login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------------------------------
   EMPLOYEE LOGIN (PER TENANT DATABASE)
--------------------------------------------------- */
exports.loginEmployeeController = async (req, res) => {
  try {
    const { companyCode, employeeId, password } = req.body;

    if (!companyCode || !employeeId || !password)
      return res.status(400).json({ message: "companyCode_employeeId_password_required" });

    // 1) Find tenant by company code
    const tenant = await Tenant.findOne({ code: companyCode });
    if (!tenant) return res.status(404).json({ message: "tenant_not_found" });

    // 2) Load tenant database
    const db = await getTenantDB(tenant._id);
    const Employee = db.model("Employee");

    // 3) Find employee inside THIS tenant only
    const emp = await Employee.findOne({
      employeeId: new RegExp(`^${employeeId}$`, "i"),
      tenant: tenant._id
    });

    if (!emp) return res.status(404).json({ message: "employee_not_found" });

    // 4) Compare password
    const stored = emp.password || "";
    let ok = false;

    if (stored.startsWith("$2")) {
      ok = await bcrypt.compare(password, stored);
    } else {
      ok = String(stored) === String(password);
    }

    if (!ok) return res.status(401).json({ message: "invalid_credentials" });

    // 5) Issue token
    const token = jwt.sign(
      {
        id: emp._id,
        employeeId: emp.employeeId,
        role: "employee",
        tenantId: tenant._id,
        companyCode: tenant.code,
      },
      process.env.JWT_SECRET || "hrms_secret_key_123",
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: {
        id: emp._id,
        name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email,
        role: "employee",
        employeeId: emp.employeeId,
        tenantId: tenant._id,
        companyCode: tenant.code,
      },
    });
  } catch (err) {
    console.error("Employee login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
