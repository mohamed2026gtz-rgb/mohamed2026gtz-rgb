const { pool } = require('../config/db');
const { isFullAdmin } = require('../utils/auth');
const { getUserScopes } = require('./userScopeService');

async function getRegionName(regionId) {
  const [rows] = await pool.query(
    'SELECT region_name FROM regions WHERE region_id = ? LIMIT 1',
    [Number(regionId)]
  );
  return rows[0]?.region_name?.trim() || null;
}

async function getRegionScopeForUser(user) {
  if (!user || isFullAdmin(user)) return null;

  const scopes = await getUserScopes(Number(user.id));
  const regionScope = scopes.find((scope) => scope.scopeType === 'region' && scope.regionId);
  if (!regionScope) return null;

  const regionName =
    (await getRegionName(regionScope.regionId)) ||
    (user.accessScope?.scopeType === 'region' ? await getRegionName(user.accessScope.regionId) : null);

  if (!regionName) {
    return { regionId: regionScope.regionId, regionName: null };
  }

  return { regionId: regionScope.regionId, regionName };
}

function isRegionScopeUser(user) {
  return user?.accessScope?.scopeType === 'region' && user?.accessScope?.regionId != null;
}

function supervisorRegionMatches(supervisorRegion, regionScope) {
  if (!regionScope?.regionName) return false;
  return String(supervisorRegion || '').trim().toLowerCase() === regionScope.regionName.trim().toLowerCase();
}

function buildSupervisorRegionFilter(regionScope) {
  if (!regionScope?.regionId) return { sql: '', params: [] };
  return {
    sql: ` AND TRIM(LOWER(region)) = TRIM(LOWER((
      SELECT region_name FROM regions WHERE region_id = ? LIMIT 1
    )))`,
    params: [regionScope.regionId],
  };
}

async function loadSupervisorForAccess(level, id) {
  const table = level === 'secondary' ? 'secondary_supervisors' : 'primary_supervisors';
  const [rows] = await pool.query(
    `SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [Number(id)]
  );
  return rows[0] || null;
}

async function assertSupervisorRegionAccess(user, level, supervisorId) {
  const regionScope = await getRegionScopeForUser(user);
  if (!regionScope) return { ok: true, regionScope: null };

  const row = await loadSupervisorForAccess(level, supervisorId);
  if (!row) {
    return { ok: false, status: 404, message: 'Supervisor not found' };
  }
  if (!supervisorRegionMatches(row.region, regionScope)) {
    return {
      ok: false,
      status: 403,
      message: 'You can only access supervisors in your assigned region',
    };
  }
  return { ok: true, regionScope, row };
}

function applyRegionScopeToFields(fields, regionScope) {
  if (!regionScope?.regionName) return fields;
  return { ...fields, region: regionScope.regionName };
}

function applyRegionScopeToImportRows(rows, regionScope) {
  if (!regionScope?.regionName) return rows;
  return rows.map((row) => ({ ...row, region: regionScope.regionName }));
}

module.exports = {
  getRegionScopeForUser,
  isRegionScopeUser,
  supervisorRegionMatches,
  buildSupervisorRegionFilter,
  assertSupervisorRegionAccess,
  applyRegionScopeToFields,
  applyRegionScopeToImportRows,
};
