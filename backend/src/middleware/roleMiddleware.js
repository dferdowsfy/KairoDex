function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    if (req.user.role !== role)
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    return next();
  };
}

module.exports = { requireRole };
