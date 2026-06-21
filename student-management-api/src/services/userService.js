const { pool } = require('../config/db');
const { hashPassword, findUserByEmail } = require('./supervisorUserService');
const {
  scopeRoleName,
  replaceUserScopes,
  getUserScopes,
  buildAccessScopeSummary,
  normalizeScopeType,
} = require('./userScopeService');
const { getUserRoles } = require('./authService');

const MODEL_TYPE = 'App\\Models\\User';

const ASSIGNABLE_SCOPE_TYPES = [
  { scopeType: 'system_admin', label: 'System admin (full access)', role: 'system admin' },
  { scopeType: 'region', label: 'Region level', role: 'Region' },
  { scopeType: 'district', label: 'District level', role: 'District' },
  { scopeType: 'school_level', label: 'School level (Primary, Secondary, …)', role: 'Center' },
  { scopeType: 'school', label: 'Specific school(s)', role: 'data entry staff' },
];

async function getRoleIdByName(name) {
  const [rows] = await pool.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [name]);
  return rows.length ? Number(rows[0].id) : null;
}

async function assignRole(userId, roleName) {
  const roleId = await getRoleIdByName(roleName);
  if (!roleId) {
    throw new Error(`Role "${roleName}" is not configured in the system`);
  }

  await pool.query(
    'DELETE FROM model_has_roles WHERE model_type = ? AND model_id = ?',
    [MODEL_TYPE, userId]
  );

  await pool.query(
    'INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?)',
    [roleId, MODEL_TYPE, userId]
  );
}

async function listStaffUsers({ page = 1, pageSize = 50, search } = {}) {
  const offset = (Math.max(1, page) - 1) * pageSize;
  let sql = `SELECT u.id, u.name, u.email, u.status, u.group_id, u.created_at
             FROM users u
             WHERE u.deleted_at IS NULL`;
  const params = [];

  if (search?.trim()) {
    sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const countSql = sql.replace(
    'SELECT u.id, u.name, u.email, u.status, u.group_id, u.created_at',
    'SELECT COUNT(*) AS c'
  );
  const [[{ c: totalCount }]] = await pool.query(countSql, params);

  sql += ' ORDER BY u.name LIMIT ? OFFSET ?';
  params.push(pageSize, offset);
  const [rows] = await pool.query(sql, params);

  const items = [];
  for (const row of rows) {
    items.push(await toStaffUserDto(row));
  }

  return {
    items,
    totalCount: Number(totalCount),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(Number(totalCount) / pageSize)),
  };
}

async function toStaffUserDto(row) {
  const roles = await getUserRoles(row.id);
  const accessScope = await buildAccessScopeSummary(row.id);
  return {
    id: String(row.id),
    fullName: row.name,
    email: row.email,
    status: row.status,
    roles,
    accessScope,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

async function getStaffUser(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [userId]
  );
  if (!rows.length) return null;
  return toStaffUserDto(rows[0]);
}

async function createStaffUser(payload) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const scopeType = normalizeScopeType(payload.scopeType);

  if (!name) return { ok: false, status: 400, message: 'Name is required' };
  if (!email) return { ok: false, status: 400, message: 'Email is required' };
  if (password.length < 6) {
    return { ok: false, status: 400, message: 'Password must be at least 6 characters' };
  }
  if (!scopeType) {
    return { ok: false, status: 400, message: 'scopeType is required' };
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return { ok: false, status: 409, message: 'A user with this email already exists' };
  }

  const roleName = scopeRoleName(scopeType);
  if (!roleName) {
    return { ok: false, status: 400, message: 'Invalid scopeType' };
  }

  const [result] = await pool.query(
    `INSERT INTO users (name, email, password, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, NOW(), NOW())`,
    [name, email, hashPassword(password), payload.forcePasswordChange !== false ? 1 : 0]
  );

  const userId = Number(result.insertId);
  await assignRole(userId, roleName);
  if (scopeType === 'system_admin') {
    await replaceUserScopes(userId, { scopeType: 'system_admin' });
  } else {
    await replaceUserScopes(userId, {
      scopeType,
      regionId: payload.regionId,
      districtId: payload.districtId,
      schoolLevel: payload.schoolLevel,
      schoolIds: payload.schoolIds,
    });
  }

  const user = await getStaffUser(userId);
  return { ok: true, status: 201, user };
}

async function updateStaffUser(userId, payload) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [userId]
  );
  if (!rows.length) return { ok: false, status: 404, message: 'User not found' };

  const updates = [];
  const params = [];

  if (payload.name?.trim()) {
    updates.push('name = ?');
    params.push(payload.name.trim());
  }
  if (payload.status?.trim()) {
    updates.push('status = ?');
    params.push(payload.status.trim());
  }
  if (payload.password?.trim() && payload.password.length >= 6) {
    updates.push('password = ?');
    params.push(hashPassword(payload.password));
    updates.push('must_change_password = ?');
    params.push(payload.forcePasswordChange !== false ? 1 : 0);
  }

  if (updates.length) {
    updates.push('updated_at = NOW()');
    params.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  if (payload.scopeType) {
    const scopeType = normalizeScopeType(payload.scopeType);
    if (!scopeType) {
      return { ok: false, status: 400, message: 'Invalid scopeType' };
    }
    const roleName = scopeRoleName(scopeType);
    if (roleName) await assignRole(userId, roleName);
    if (scopeType === 'system_admin') {
      await replaceUserScopes(userId, { scopeType: 'system_admin' });
    } else {
      await replaceUserScopes(userId, {
        scopeType,
        regionId: payload.regionId,
        districtId: payload.districtId,
        schoolLevel: payload.schoolLevel,
        schoolIds: payload.schoolIds,
      });
    }
  }

  const user = await getStaffUser(userId);
  return { ok: true, status: 200, user };
}

module.exports = {
  ASSIGNABLE_SCOPE_TYPES,
  listStaffUsers,
  getStaffUser,
  createStaffUser,
  updateStaffUser,
  getUserScopes,
};