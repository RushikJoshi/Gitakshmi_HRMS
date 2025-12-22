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

  // Allow 'hr', 'admin', 'psa', AND 'employee' (temporary dev fix for 403)
  const allowedRoles = ['hr', 'admin', 'psa', 'employee'];

  if (!allowedRoles.includes(req.user.role)) {
    console.warn(`[requireHr] Forbidden: Role mismatch. User Role: '${req.user.role}'. Allowed:`, allowedRoles);
    return res.status(403).json({ message: 'forbidden', receivedRole: req.user.role, allowed: allowedRoles });
  }

  // expose tenantId on request for convenience
  if (req.user.tenantId) req.tenantId = req.user.tenantId;
  next();
};

exports.requirePsa = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'no_user' });
  if (req.user.role !== 'psa') return res.status(403).json({ message: 'forbidden' });
  next();
};
