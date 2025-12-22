const Tenant = require('../models/Tenant');
let Counter = require('../models/Counter');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Counter may be exported as a Schema (for multi-tenant reuse) or as a Model.
if (typeof Counter.findOneAndUpdate !== 'function') {
  try {
    Counter = mongoose.model('Counter');
  } catch (e) {
    Counter = mongoose.model('Counter', Counter);
  }
}

const getTenantDB = require('../utils/tenantDB');
const emailService = require('../utils/emailService');
const smsService = require('../utils/smsService');
const jwtUtil = require('../utils/jwt');

const EmployeeSchema = require('../models/Employee');
const DepartmentSchema = require('../models/Department');
const LeaveRequestSchema = require('../models/LeaveRequest');
const AttendanceSchema = require('../models/Attendance');
const ActivitySchema = require('../models/Activity');
const UserSchema = require('../models/User');


// ======================================================
// CREATE TENANT (COMPANY)
// ======================================================
exports.createTenant = async (req, res, next) => {
  try {
    const { name, domain, emailDomain, plan, modules, status, meta } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'name_required',
        message: 'Company name is required'
      });
    }

    // Check duplicate name
    const existing = await Tenant.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'tenant_exists',
        message: 'Company with this name already exists'
      });
    }

    // Duplicate email domain
    if (emailDomain) {
      const existingEmailDomain = await Tenant.findOne({ emailDomain: emailDomain.trim() });
      if (existingEmailDomain) {
        return res.status(400).json({
          success: false,
          error: 'email_domain_exists',
          message: 'Company with this email domain already exists'
        });
      }
    }

    // Generate company slug
    const makeSlug = s =>
      (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 3) || `c${Date.now()}`;

    const slug = makeSlug(name);

    // Counter for company code
    const counter = await Counter.findOneAndUpdate(
      { key: slug },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).lean();

    const seq = counter?.seq || 1;
    const code = `${slug}${String(seq).padStart(3, '0')}`;

    // Generate verification token
    const token = crypto.randomBytes(24).toString('hex');

    const t = new Tenant({
      name: name.trim(),
      code,
      domain: domain?.trim() || null,
      emailDomain: emailDomain?.trim() || null,
      plan: plan || 'free',
      modules: Array.isArray(modules) ? modules : [],
      status: 'pending',
      isVerified: false,
      verificationToken: token,
      meta: meta || {}
    });

    await t.save();

    // Initialize tenant database
    try {
      const db = await getTenantDB(t.code);

      db.model("Employee", EmployeeSchema);
      db.model("Department", DepartmentSchema);
      db.model("LeaveRequest", LeaveRequestSchema);
      db.model("Attendance", AttendanceSchema);
      // Counter is global (in main connection), NOT per-tenant
      db.model("User", UserSchema);

      db.model('Activity', ActivitySchema);
      const Activity = db.model('Activity');
      await Activity.create({
        action: 'Tenant created',
        company: t.name,
        tenant: t._id,
        meta: { seeded: true }
      });

      console.log(`✓ Tenant DB initialized: tenant_${t.code}`);
    } catch (dbInitErr) {
      console.error('Tenant DB initialization failed:', dbInitErr);
    }

    // ======================================================
    // SEND VERIFICATION EMAIL (Backend link)
    // ======================================================
    try {
      const port = process.env.PORT || 5000;
      let baseURL = process.env.NGROK_URL || process.env.BACKEND_URL || '';
      const wantsDynamic = String(process.env.BACKEND_URL_DYNAMIC || '').toLowerCase() === 'true';
      if (!baseURL || /localhost/i.test(baseURL)) {
        if (wantsDynamic) {
          try {
            const os = require('os');
            const nets = os.networkInterfaces();
            let ip = null;
            for (const name of Object.keys(nets)) {
              for (const net of nets[name] || []) {
                const addr = net.address;
                const isBadName = /vmware|virtualbox|loopback|vEthernet|bridge/i.test(name || '');
                const isBadAddr = /^127\.|^169\.254\.|^192\.168\.56\./.test(addr || '');
                const isGatewayLike = /\.1$/.test(addr || '');
                if (net.family === 'IPv4' && !net.internal && !isBadName && !isBadAddr && !isGatewayLike) { ip = addr; break; }
              }
              if (ip) break;
            }
            if (ip) baseURL = `http://${ip}:${port}`;
          } catch (_) { /* ignore */ }
        }
      }
      if (!baseURL) baseURL = `http://localhost:${port}`;
      const verifyUrl = `${process.env.NGROK_URL}/api/company/verify-company/${token}`;



      const primaryEmail = t.meta?.primaryEmail;
      const phone = t.meta?.phone;

      const subject = `Verify your company ${t.name}`;
      const html = `
        <p>Hello ${t.meta?.ownerName || ''},</p>
        <p>Your company <strong>${t.name}</strong> has been created in our system.</p>
        <p>Company Code: <strong>${t.code}</strong></p>
        ${t.meta?.adminPassword ? `<p>Temporary password: <strong>${t.meta.adminPassword}</strong></p>` : ''}
        <p>Please confirm and activate your company by clicking the button below:</p>
        <p>
          <a href="${verifyUrl}"
            style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
            Accept Invitation
          </a>
        </p>
        <p>If you did not expect this, ignore this email.</p>
      `;

      if (primaryEmail) {
        await emailService.sendMail({ to: primaryEmail, subject, html });
      }

      if (phone) {
        const smsBody = `Activate company ${t.name} (code: ${t.code}). Click: ${verifyUrl}`;
        try { await smsService.sendSms({ to: phone, body: smsBody }); } catch (e) { }
      }
    } catch (mailErr) {
      console.error('Failed to send verification message:', mailErr);
    }

    res.status(201).json({
      success: true,
      data: t
    });

  } catch (err) {
    console.error('Tenant creation error:', err);
    next(err);
  }
};



// ======================================================
// BACKEND-ONLY COMPANY VERIFICATION (Recommended)
// ======================================================
exports.verifyCompany = async (req, res, next) => {
  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).send('<h3>Missing verification token</h3>');
    }

    const t = await Tenant.findOne({ verificationToken: token });

    if (!t) {
      return res.status(404).send('<h3>Invalid or expired verification link</h3>');
    }

    t.isVerified = true;
    t.status = 'active';
    t.verificationToken = null;
    await t.save();

    // Support JSON response for SPA consumption when requested
    const wantsJson = req.query.json === '1' || req.query.format === 'json';
    if (wantsJson) {
      return res.json({ success: true, message: 'Company activated', data: { id: t._id, name: t.name, code: t.code, status: t.status } });
    }

    return res.send(`
      <html>
      <body style="font-family:Arial;padding:40px;text-align:center;">
        <h2 style="color:green;">Company "${t.name}" has been successfully activated!</h2>
        <p>You may now log in to the HRMS dashboard.</p>
      </body>
      </html>
    `);

  } catch (err) {
    next(err);
  }
};



// ======================================================
// Other existing handlers (unchanged)
// ======================================================

exports.listTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants);
  } catch (err) { next(err); }
};

exports.getTenant = async (req, res, next) => {
  try {
    const t = await Tenant.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json(t);
  } catch (err) { next(err); }
};

exports.getMyTenant = async (req, res, next) => {
  try {
    const tid = req.tenantId || req.user?.tenantId;
    if (!tid) return res.status(400).json({ error: 'no_tenant' });
    const t = await Tenant.findById(tid);
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json(t);
  } catch (err) { next(err); }
};

exports.updateTenant = async (req, res, next) => {
  try {
    const { name, domain, emailDomain, plan, status, meta, modules } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (domain !== undefined) updates.domain = domain?.trim() || null;
    if (emailDomain !== undefined) updates.emailDomain = emailDomain?.trim() || null;
    if (plan !== undefined) updates.plan = plan;
    if (status !== undefined) updates.status = status;
    if (Array.isArray(modules)) updates.modules = modules;

    if (meta !== undefined && typeof meta === 'object') {
      const t = await Tenant.findById(req.params.id);
      if (t) updates.meta = { ...(t.meta || {}), ...meta };
      else updates.meta = meta;
    }

    const t = await Tenant.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json(t);
  } catch (err) { next(err); }
};

exports.deleteTenant = async (req, res, next) => {
  try {
    const t = await Tenant.findByIdAndUpdate(req.params.id, { $set: { status: 'deleted' } }, { new: true });
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.updateModules = async (req, res, next) => {
  try {
    const { modules } = req.body;
    if (!Array.isArray(modules)) return res.status(400).json({ error: 'invalid_modules' });

    const before = await Tenant.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'not_found' });

    const t = await Tenant.findByIdAndUpdate(req.params.id, { $set: { modules } }, { new: true });
    if (!t) return res.status(404).json({ error: 'not_found' });

    try {
      const beforeModules = before.modules || [];
      const afterModules = modules || [];
      const enabled = afterModules.filter(m => !beforeModules.includes(m));
      const disabled = beforeModules.filter(m => !afterModules.includes(m));

      let actionText = 'Modules updated';
      if (enabled.length > 0 && disabled.length > 0) {
        actionText = `Modules enabled: ${enabled.join(', ')}; disabled: ${disabled.join(', ')}`;
      } else if (enabled.length > 0) {
        actionText = `Modules enabled: ${enabled.join(', ')}`;
      } else if (disabled.length > 0) {
        actionText = `Modules disabled: ${disabled.join(', ')}`;
      }

      const db = await getTenantDB(t._id);
      db.model('Activity', ActivitySchema);
      const Activity = db.model('Activity');

      await Activity.create({
        action: actionText,
        company: t.name,
        tenant: t._id,
        meta: { enabled, disabled, before: beforeModules, after: afterModules }
      });
    } catch (activityErr) {
      console.error('Failed to log module update activity:', activityErr);
    }

    res.json(t);
  } catch (err) { next(err); }
};


exports.sendActivationEmail = async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    const { adminEmail, password } = req.body;
    if (!adminEmail) return res.status(400).json({ error: 'admin_email_required' });

    const t = await Tenant.findById(tenantId);
    if (!t) return res.status(404).json({ error: 'not_found' });

    const token = jwtUtil.sign({ tenantId: t._id }, { expiresIn: '7d' });
    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const activationUrl = `${backendBase}/api/tenants/activate?token=${token}`;

    const subject = `Activate your company account: ${t.name}`;
    const html = `
      <p>Hello,</p>
      <p>Your company <strong>${t.name}</strong> has been created.</p>
      <p>Company Code: <strong>${t.code}</strong></p>
      ${password ? `<p>Temporary Password: <strong>${password}</strong></p>` : ''}
      <p>Please click the link below to confirm and activate your account:</p>
      <p><a href="${activationUrl}">Activate account</a></p>
      <p>This link expires in 7 days.</p>
    `;

    await emailService.sendMail({ to: adminEmail, subject, html });
    res.json({ success: true, message: 'activation_email_sent' });
  } catch (err) { next(err); }
};


exports.sendActivationSms = async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone_required' });

    const t = await Tenant.findById(tenantId);
    if (!t) return res.status(404).json({ error: 'not_found' });

    const token = jwtUtil.sign({ tenantId: t._id }, { expiresIn: '7d' });
    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const activationUrl = `${backendBase}/api/tenants/activate?token=${token}`;

    const body = `Activate company ${t.name} (code: ${t.code}). Open: ${activationUrl}`;

    await smsService.sendSms({ to: phone, body });
    res.json({ success: true, message: 'activation_sms_sent' });
  } catch (err) { next(err); }
};


exports.activateTenant = async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).send('<h3>Missing token</h3>');

    let payload;
    try {
      payload = jwtUtil.verify(token);
    } catch (e) {
      return res.status(400).send('<h3>Invalid or expired token</h3>');
    }

    const tenantId = payload.tenantId;
    if (!tenantId) return res.status(400).send('<h3>Invalid token payload</h3>');

    const t = await Tenant.findByIdAndUpdate(tenantId, { $set: { status: 'active' } }, { new: true });
    if (!t) return res.status(404).send('<h3>Tenant not found</h3>');

    return res.send(`
      <html><body>
      <h2>Company "${t.name}" activated</h2>
      <p>You may now log in.</p>
      </body></html>
    `);
  } catch (err) { next(err); }
};


exports.psaStats = async (req, res, next) => {
  try {
    const total = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'active' });
    const tenants = await Tenant.find({}, 'modules');
    const activeModules = tenants.reduce((acc, t) => acc + (t.modules?.length || 0), 0);
    const deactiveTenants = await Tenant.countDocuments({ status: { $ne: 'active' } });

    // Ensure we always return numeric totals for PSA dashboard
    const safeTotal = Number.isFinite(total) ? total : 0;
    const safeActive = Number.isFinite(activeTenants) ? activeTenants : 0;
    const safeInactive = Number.isFinite(deactiveTenants) ? deactiveTenants : (safeTotal - safeActive);

    res.json({
      companies: safeTotal,
      activeTenants: safeActive,
      deactiveTenants: safeInactive,
      activeModules,
      // Backwards-compatible canonical fields required by frontend
      total: safeTotal,
      active: safeActive,
      inactive: safeInactive
    });
  } catch (err) { next(err); }
};
