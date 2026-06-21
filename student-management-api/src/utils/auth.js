const FULL_ADMIN_ROLES = new Set([
  'system admin',
  'manager',
  'admin',
  'administrator',
]);

const ADMINISTRATION_ROLES = new Set([
  ...FULL_ADMIN_ROLES,
  'data entry staff',
  'center',
  'district',
  'region',
  'university',
]);

const SCOPED_STAFF_ROLES = new Set(['data entry staff', 'center', 'district', 'region', 'university']);

const EXAM_SUPERVISOR_ROLES = new Set(['supervisor', 'exam supervisor']);

/** @deprecated use isAdministration */
const ADMIN_ROLES = new Set([...ADMINISTRATION_ROLES, ...EXAM_SUPERVISOR_ROLES]);

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function hasRole(user, roleSet) {
  return (user?.roles || []).some((r) => roleSet.has(normalizeRole(r)));
}

function isAdministration(user) {
  return hasRole(user, ADMINISTRATION_ROLES);
}

function isExamSupervisor(user) {
  return hasRole(user, EXAM_SUPERVISOR_ROLES);
}

function isFullAdmin(user) {
  return hasRole(user, FULL_ADMIN_ROLES);
}

function isScopedStaff(user) {
  return hasRole(user, SCOPED_STAFF_ROLES);
}

/** Full admin access — system admin / manager only (not region/district/school scoped staff). */
function isAdmin(user) {
  return isFullAdmin(user);
}

function verifyLaravelBcrypt(password, hash) {
  const bcrypt = require('bcryptjs');
  const normalized = hash.replace(/^\$2y\$/, '$2a$');
  return bcrypt.compareSync(password, normalized);
}

function displayRoleName(role) {
  const r = normalizeRole(role);
  if (r === 'supervisor') return 'Exam Supervisor';
  if (r === 'system admin') return 'Administration';
  if (r === 'manager') return 'Administration';
  if (r === 'data entry staff') return 'Administration';
  return role;
}

module.exports = {
  ADMIN_ROLES,
  ADMINISTRATION_ROLES,
  FULL_ADMIN_ROLES,
  SCOPED_STAFF_ROLES,
  EXAM_SUPERVISOR_ROLES,
  isAdmin,
  isFullAdmin,
  isScopedStaff,
  isAdministration,
  isExamSupervisor,
  verifyLaravelBcrypt,
  displayRoleName,
  normalizeRole,
};
