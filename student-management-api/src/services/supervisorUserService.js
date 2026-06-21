const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const EXAM_SUPERVISOR_ROLE = 'Supervisor';
const MODEL_TYPE = 'App\\Models\\User';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10).replace(/^\$2a\$/, '$2y$');
}

async function getRoleIdByName(name) {
  const [rows] = await pool.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [name]);
  return rows.length ? Number(rows[0].id) : null;
}

async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1',
    [normalized]
  );
  return rows.length ? rows[0] : null;
}

async function assignExamSupervisorRole(userId) {
  const roleId = await getRoleIdByName(EXAM_SUPERVISOR_ROLE);
  if (!roleId) return;

  const [existing] = await pool.query(
    'SELECT role_id FROM model_has_roles WHERE role_id = ? AND model_type = ? AND model_id = ? LIMIT 1',
    [roleId, MODEL_TYPE, userId]
  );
  if (existing.length) return;

  await pool.query(
    'INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?)',
    [roleId, MODEL_TYPE, userId]
  );
}

async function createSupervisorUser({ name, email, password, forcePasswordChange = true }) {
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) throw new Error('Email is required to create a supervisor login account');
  if (!password || String(password).length < 6) {
    throw new Error('Initial password must be at least 6 characters');
  }

  const existing = await findUserByEmail(emailNorm);
  if (existing) {
    await assignExamSupervisorRole(existing.id);
    return Number(existing.id);
  }

  const [result] = await pool.query(
    `INSERT INTO users (name, email, password, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, NOW(), NOW())`,
    [name.trim(), emailNorm, hashPassword(password), forcePasswordChange ? 1 : 0]
  );

  const userId = Number(result.insertId);
  await assignExamSupervisorRole(userId);
  return userId;
}

async function linkSupervisorUser(level, supervisorId, userId) {
  const table = level === 'secondary' ? 'secondary_supervisors' : 'primary_supervisors';
  await pool.query(`UPDATE ${table} SET user_id = ? WHERE id = ?`, [userId, supervisorId]);
}

async function resetSupervisorPassword(userId, newPassword, forceChange = true) {
  await pool.query(
    `UPDATE users SET password = ?, must_change_password = ?, password_changed_at = NULL, updated_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [hashPassword(newPassword), forceChange ? 1 : 0, userId]
  );
}

module.exports = {
  EXAM_SUPERVISOR_ROLE,
  createSupervisorUser,
  linkSupervisorUser,
  findUserByEmail,
  assignExamSupervisorRole,
  resetSupervisorPassword,
  hashPassword,
};
