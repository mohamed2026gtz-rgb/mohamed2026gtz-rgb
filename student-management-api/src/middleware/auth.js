const jwt = require('jsonwebtoken');
const { isAdministration, isExamSupervisor, isFullAdmin } = require('../utils/auth');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    req.user = {
      id: decoded.sub,
      email: decoded.name,
      fullName: decoded.fullName,
      groupId: decoded.groupId ? Number(decoded.groupId) : null,
      schoolId: decoded.schoolId ? Number(decoded.schoolId) : null,
      roles: decoded.roles || [],
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdministration(req, res, next) {
  if (!isAdministration(req.user)) {
    return res.status(403).json({ message: 'Administration access required' });
  }
  next();
}

function requireFullAdmin(req, res, next) {
  if (!isFullAdmin(req.user)) {
    return res.status(403).json({ message: 'Full administration access required' });
  }
  next();
}

function blockExamSupervisor(req, res, next) {
  if (isExamSupervisor(req.user) && !isAdministration(req.user)) {
    return res.status(403).json({
      message: 'Exam supervisors can only access their assigned exam center',
    });
  }
  next();
}

module.exports = { authenticate, requireAdministration, requireFullAdmin, blockExamSupervisor };
