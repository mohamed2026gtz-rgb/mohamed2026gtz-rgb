const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { verifyLaravelBcrypt, isExamSupervisor, EXAM_SUPERVISOR_ROLES, normalizeRole } = require('../utils/auth');
const { hashPassword } = require('./supervisorUserService');
const { getSupervisorAssignment, findSupervisorAssignmentForUser } = require('./supervisorScopeService');
const { buildAccessScopeSummary } = require('./userScopeService');

async function getUserRoles(userId) {
  const [rows] = await pool.query(
    `SELECT r.name
     FROM model_has_roles mhr
     JOIN roles r ON r.id = mhr.role_id
     WHERE mhr.model_id = ? AND mhr.model_type LIKE '%User%'`,
    [userId]
  );
  return rows.map((r) => r.name);
}

async function resolveSchoolId(groupId) {
  if (!groupId) return null;

  const [assignments] = await pool.query(
    'SELECT school_number FROM group_school_assignments WHERE group_id = ? LIMIT 1',
    [groupId]
  );
  if (!assignments.length) return null;

  const [schools] = await pool.query(
    'SELECT school_id FROM schools_management WHERE school_number = ? LIMIT 1',
    [assignments[0].school_number]
  );
  return schools.length ? Number(schools[0].school_id) : null;
}

async function buildProfile(user) {
  const roles = await getUserRoles(user.id);
  const schoolId = await resolveSchoolId(user.group_id);
  const accessScope = await buildAccessScopeSummary(user.id);

  if (!roles.length && accessScope.scopeType) {
    const { scopeRoleName } = require('./userScopeService');
    const inferred = scopeRoleName(accessScope.scopeType);
    if (inferred) roles.push(inferred);
  }

  const profile = {
    id: String(user.id),
    fullName: user.name,
    email: user.email,
    userName: user.email,
    schoolId,
    regionId: accessScope.regionId,
    districtId: accessScope.districtId,
    roles,
    mustChangePassword: Boolean(Number(user.must_change_password)),
    accessScope,
  };

  const supervisorAssignment = await findSupervisorAssignmentForUser({
    id: user.id,
    email: user.email,
  });

  if (supervisorAssignment) {
    const hasSupervisorRole = roles.some((role) =>
      EXAM_SUPERVISOR_ROLES.has(normalizeRole(role))
    );
    if (!hasSupervisorRole) {
      roles.push('Supervisor');
      profile.roles = roles;
    }

    profile.supervisorAssignment = supervisorAssignment;

    const { level, supervisorId } = supervisorAssignment;
    const table = level === 'secondary' ? 'secondary_supervisors' : 'primary_supervisors';
    const [supervisorRows] = await pool.query(
      `SELECT image_url FROM ${table} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [supervisorId]
    );
    const hasPhoto = Boolean(supervisorRows[0]?.image_url);
    profile.hasPicture = hasPhoto;
    profile.photoUrl =
      hasPhoto && level ? `/api/supervisors/${level}/${supervisorId}/photo` : null;
  } else if (isExamSupervisor(profile)) {
    profile.supervisorAssignment = null;
  }

  return profile;
}

function signToken(user, profile) {
  const expiresMinutes = Number(process.env.JWT_EXPIRE_MINUTES || 60);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

  const payload = {
    sub: String(user.id),
    name: user.email,
    fullName: user.name,
    groupId: user.group_id ? String(user.group_id) : undefined,
    schoolId: profile.schoolId ? String(profile.schoolId) : undefined,
    roles: profile.roles,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    expiresIn: `${expiresMinutes}m`,
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

async function login(username, password) {
  const login = username.trim();
  const [users] = await pool.query(
    `SELECT * FROM users
     WHERE (email = ? OR LOWER(email) = LOWER(?))
       AND deleted_at IS NULL
     LIMIT 1`,
    [login, login]
  );

  if (!users.length) return null;
  const user = users[0];

  if (String(user.status).toLowerCase() !== 'active') return null;
  if (!verifyLaravelBcrypt(password, user.password)) return null;

  const profile = await buildProfile(user);
  const { token, expiresAt } = signToken(user, profile);

  return {
    token,
    expiresAt,
    user: profile,
    mustChangePassword: profile.mustChangePassword,
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  const newPass = String(newPassword || '').trim();
  if (newPass.length < 6) {
    return { ok: false, status: 400, message: 'New password must be at least 6 characters' };
  }

  const [users] = await pool.query(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [userId]
  );
  if (!users.length) {
    return { ok: false, status: 404, message: 'User not found' };
  }
  const user = users[0];

  if (!verifyLaravelBcrypt(currentPassword, user.password)) {
    return { ok: false, status: 401, message: 'Current password is incorrect' };
  }

  await pool.query(
    `UPDATE users SET password = ?, must_change_password = 0, password_changed_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [hashPassword(newPass), userId]
  );

  const profile = await buildProfile({ ...user, must_change_password: 0 });
  const session = signToken(user, profile);

  return {
    ok: true,
    status: 200,
    message: 'Password changed successfully',
    ...session,
    user: profile,
    mustChangePassword: false,
  };
}

async function getProfile(userId) {
  if (String(userId).startsWith('student:')) {
    const studentAuth = require('./studentAuthService');
    return studentAuth.getStudentProfileBySub(userId);
  }

  const [users] = await pool.query(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [userId]
  );
  if (!users.length) return null;
  return buildProfile(users[0]);
}

module.exports = { login, getProfile, changePassword, buildProfile, getUserRoles };
