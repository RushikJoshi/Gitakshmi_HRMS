const jwt = require('jsonwebtoken');

function getTokenFromHeader(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const parts = h.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
}

exports.authenticate = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: 'no_token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "hrms_secret_key_123");
    req.user = payload; // minimal info: email, role, companyCode, tenantId
    if (payload.tenantId) req.tenantId = payload.tenantId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'invalid_token', error: err.message });
  }
};

exports.requireHr = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'no_user' });

  // Normalize role for comparison
  const userRole = (req.user.role || '').toLowerCase();

  // Allow 'hr', 'admin', 'psa', 'employee', AND 'user' (for HR dashboard access)
  // Added 'company_admin' to cover potential variations
  const allowedRoles = ['hr', 'admin', 'psa', 'employee', 'user', 'company_admin', 'candidate'];

  if (!allowedRoles.includes(userRole)) {
    console.warn(`[requireHr] Forbidden: Role mismatch. User Role: '${req.user.role}' (normalized: '${userRole}'). Allowed:`, allowedRoles);
    return res.status(403).json({ message: 'forbidden', receivedRole: req.user.role, allowed: allowedRoles });
  }

  // expose tenantId on request for convenience
  if (req.user.tenantId) req.tenantId = req.user.tenantId;

  // Debug log for success
  if (process.env.NODE_ENV !== 'production') {
    // console.log(`[requireHr] Success: User ${req.user.email} authorized.`);
  }
  next();
};

exports.requirePsa = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'no_user' });
  if (req.user.role !== 'psa') return res.status(403).json({ message: 'forbidden' });
  next();
};

exports.authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Normalize checking (handle both upper/lower case roles)
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const allowedRoles = roles.map(r => r.toLowerCase());

    // If 'Admin' is passed, allow 'admin' role. 
    if (roles.length && !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient Permissions' });
    }

    next();
  };
};
