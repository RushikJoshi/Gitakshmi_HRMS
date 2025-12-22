// Basic auth middleware placeholder
module.exports = (req, res, next) => {
  // In real app, verify JWT here and attach user to req.user
  const auth = req.headers.authorization;
  if (auth) {
    req.user = { id: 'mock-user', role: 'admin' };
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized' });
};
