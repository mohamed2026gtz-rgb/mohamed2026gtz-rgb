const { pool } = require('../config/db');
const { isFullAdmin } = require('../utils/auth');

const SCOPE_TYPES = new Set(['region', 'district', 'school_level', 'school', 'system_admin']);

const ROLE_BY_SCOPE = {
  region: 'Region',
  district: 'District',
  school_level: 'Center',
  school: 'data entry staff',
  system_admin: 'system admin',
};

function normalizeScopeType(value) {
  const v = String(value || '').trim().toLowerCase();
  return SCOPE_TYPES.has(v) ? v : null;
}

function scopeRoleName(scopeType) {
  return ROLE_BY_SCOPE[scopeType] || null;
}

async function getUserScopes(userId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, scope_type, region_id, district_id, school_level, school_id
     FROM user_access_scopes
     WHERE user_id = ?
     ORDER BY id`,
    [userId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    scopeType: row.scope_type,
    regionId: row.region_id != null ? Number(row.region_id) : null,
    districtId: row.district_id != null ? Number(row.district_id) : null,
    schoolLevel: row.school_level || null,
    schoolId: row.school_id != null ? Number(row.school_id) : null,
  }));
}

async function resolveSchoolIdsFromScopes(scopes) {
  if (!scopes.length) return [];

  const schoolIds = new Set();

  for (const scope of scopes) {
    if (scope.scopeType === 'region' && scope.regionId) {
      const [rows] = await pool.query(
        `SELECT school_id FROM schools_management
         WHERE region_id = ?
            OR TRIM(region) = (SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1)`,
        [scope.regionId, scope.regionId]
      );
      for (const row of rows) schoolIds.add(Number(row.school_id));
      continue;
    }

    if (scope.scopeType === 'district' && scope.districtId) {
      const [districtRows] = await pool.query(
        'SELECT district_name, region_id FROM districts WHERE district_id = ? LIMIT 1',
        [scope.districtId]
      );
      if (!districtRows.length) continue;
      const district = districtRows[0];
      const [regionRows] = await pool.query(
        'SELECT region_name FROM regions WHERE region_id = ? LIMIT 1',
        [district.region_id]
      );
      const regionName = regionRows[0]?.region_name || null;
      const [rows] = await pool.query(
        `SELECT school_id FROM schools_management
         WHERE TRIM(district) = TRIM(?)
           AND (region_id = ? OR (? IS NOT NULL AND TRIM(region) = TRIM(?)))`,
        [district.district_name, district.region_id, regionName, regionName]
      );
      for (const row of rows) schoolIds.add(Number(row.school_id));
      continue;
    }

    if (scope.scopeType === 'school_level' && scope.schoolLevel) {
      let sql = 'SELECT school_id FROM schools_management WHERE school_level = ?';
      const params = [scope.schoolLevel];
      if (scope.districtId) {
        const [districtRows] = await pool.query(
          'SELECT district_name, region_id FROM districts WHERE district_id = ? LIMIT 1',
          [scope.districtId]
        );
        if (districtRows.length) {
          sql += ' AND district = ? AND region_id = ?';
          params.push(districtRows[0].district_name, districtRows[0].region_id);
        }
      } else if (scope.regionId) {
        sql += ` AND (region_id = ? OR TRIM(region) = (
          SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1
        ))`;
        params.push(scope.regionId, scope.regionId);
      }
      const [rows] = await pool.query(sql, params);
      for (const row of rows) schoolIds.add(Number(row.school_id));
      continue;
    }

    if (scope.scopeType === 'school' && scope.schoolId) {
      schoolIds.add(Number(scope.schoolId));
    }
  }

  return [...schoolIds];
}

async function resolveSchoolNumbersFromScopes(scopes) {
  if (!scopes.length) return [];

  const schoolNumbers = new Set();

  for (const scope of scopes) {
    if (scope.scopeType === 'region' && scope.regionId) {
      const [rows] = await pool.query(
        `SELECT school_number FROM schools_management
         WHERE region_id = ?
            OR TRIM(region) = (SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1)`,
        [scope.regionId, scope.regionId]
      );
      for (const row of rows) schoolNumbers.add(row.school_number);
      continue;
    }

    if (scope.scopeType === 'district' && scope.districtId) {
      const [districtRows] = await pool.query(
        'SELECT district_name, region_id FROM districts WHERE district_id = ? LIMIT 1',
        [scope.districtId]
      );
      if (!districtRows.length) continue;
      const district = districtRows[0];
      const [rows] = await pool.query(
        `SELECT school_number FROM schools_management
         WHERE district = ? AND region_id = ?
           AND school_number IS NOT NULL AND TRIM(school_number) <> ''`,
        [district.district_name, district.region_id]
      );
      for (const row of rows) schoolNumbers.add(row.school_number);
      continue;
    }

    if (scope.scopeType === 'school_level' && scope.schoolLevel) {
      let sql = `SELECT school_number FROM schools_management
                 WHERE school_level = ?
                   AND school_number IS NOT NULL AND TRIM(school_number) <> ''`;
      const params = [scope.schoolLevel];
      if (scope.districtId) {
        const [districtRows] = await pool.query(
          'SELECT district_name, region_id FROM districts WHERE district_id = ? LIMIT 1',
          [scope.districtId]
        );
        if (districtRows.length) {
          sql += ' AND district = ? AND region_id = ?';
          params.push(districtRows[0].district_name, districtRows[0].region_id);
        }
      } else if (scope.regionId) {
        sql += ` AND (region_id = ? OR TRIM(region) = (
          SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1
        ))`;
        params.push(scope.regionId, scope.regionId);
      }
      const [rows] = await pool.query(sql, params);
      for (const row of rows) schoolNumbers.add(row.school_number);
      continue;
    }

    if (scope.scopeType === 'school' && scope.schoolId) {
      const [rows] = await pool.query(
        `SELECT school_number FROM schools_management
         WHERE school_id = ? AND school_number IS NOT NULL AND TRIM(school_number) <> '' LIMIT 1`,
        [scope.schoolId]
      );
      if (rows.length) schoolNumbers.add(rows[0].school_number);
    }
  }

  return [...schoolNumbers];
}

async function getAllowedSchoolNumbersForUser(user) {
  if (!user?.id) return [];
  if (isFullAdmin(user)) return null;

  const userId = Number(user.id);
  const scopes = await getUserScopes(userId);
  if (scopes.length) {
    return resolveSchoolNumbersFromScopes(scopes);
  }

  if (user.groupId) {
    const [rows] = await pool.query(
      'SELECT school_number FROM group_school_assignments WHERE group_id = ?',
      [user.groupId]
    );
    return rows.map((r) => r.school_number);
  }

  return [];
}

async function buildAccessScopeSummary(userId) {
  const scopes = await getUserScopes(userId);
  if (!scopes.length) {
    return {
      scopeType: null,
      regionId: null,
      districtId: null,
      schoolLevel: null,
      schoolIds: [],
      schoolCount: 0,
    };
  }

  const primary = scopes[0];
  const schoolIds = scopes
    .filter((s) => s.scopeType === 'school' && s.schoolId)
    .map((s) => s.schoolId);

  let regionId = primary.regionId;
  if (primary.scopeType === 'district' && primary.districtId && !regionId) {
    const [districtRows] = await pool.query(
      'SELECT region_id FROM districts WHERE district_id = ? LIMIT 1',
      [primary.districtId]
    );
    if (districtRows.length) regionId = Number(districtRows[0].region_id);
  }

  const resolvedSchoolIds = await resolveSchoolIdsFromScopes(scopes);
  const schoolNumbers = await resolveSchoolNumbersFromScopes(scopes);

  let regionName = null;
  let districtName = null;
  if (regionId) {
    const [regionRows] = await pool.query(
      'SELECT region_name FROM regions WHERE region_id = ? LIMIT 1',
      [regionId]
    );
    regionName = regionRows[0]?.region_name || null;
  }
  if (primary.districtId) {
    const [districtRows] = await pool.query(
      'SELECT district_name FROM districts WHERE district_id = ? LIMIT 1',
      [primary.districtId]
    );
    districtName = districtRows[0]?.district_name || null;
  }

  return {
    scopeType: primary.scopeType,
    regionId,
    regionName,
    districtId: primary.districtId,
    districtName,
    schoolLevel: primary.schoolLevel,
    schoolIds: schoolIds.length ? schoolIds : undefined,
    schoolCount: resolvedSchoolIds.length || schoolNumbers.length,
    scopes,
  };
}

function validateScopePayload({ scopeType, regionId, districtId, schoolLevel, schoolIds }) {
  const type = normalizeScopeType(scopeType);
  if (!type) {
    return { ok: false, message: 'scopeType must be region, district, school_level, school, or system_admin' };
  }

  if (type === 'system_admin') {
    return { ok: true, scopeType: type };
  }

  if (type === 'region' && !regionId) {
    return { ok: false, message: 'regionId is required for region scope' };
  }
  if (type === 'district' && !districtId) {
    return { ok: false, message: 'districtId is required for district scope' };
  }
  if (type === 'school_level' && !schoolLevel) {
    return { ok: false, message: 'schoolLevel is required for school_level scope' };
  }
  if (type === 'school_level' && !regionId && !districtId) {
    return { ok: false, message: 'regionId or districtId is required for school_level scope' };
  }
  if (type === 'school' && (!Array.isArray(schoolIds) || !schoolIds.length)) {
    return { ok: false, message: 'schoolIds array is required for school scope' };
  }

  return { ok: true, scopeType: type };
}

async function replaceUserScopes(userId, { scopeType, regionId, districtId, schoolLevel, schoolIds }) {
  const check = validateScopePayload({ scopeType, regionId, districtId, schoolLevel, schoolIds });
  if (!check.ok) throw new Error(check.message);

  const type = check.scopeType;
  const rows = [];

  if (type === 'system_admin') {
    rows.length = 0;
  } else if (type === 'region') {
    rows.push({ scope_type: type, region_id: Number(regionId), district_id: null, school_level: null, school_id: null });
  } else if (type === 'district') {
    rows.push({ scope_type: type, region_id: null, district_id: Number(districtId), school_level: null, school_id: null });
  } else if (type === 'school_level') {
    rows.push({
      scope_type: type,
      region_id: regionId ? Number(regionId) : null,
      district_id: districtId ? Number(districtId) : null,
      school_level: String(schoolLevel).trim(),
      school_id: null,
    });
  } else if (type === 'school') {
    for (const id of schoolIds) {
      rows.push({
        scope_type: type,
        region_id: regionId ? Number(regionId) : null,
        district_id: districtId ? Number(districtId) : null,
        school_level: null,
        school_id: Number(id),
      });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM user_access_scopes WHERE user_id = ?', [userId]);
    for (const row of rows) {
      await conn.query(
        `INSERT INTO user_access_scopes
           (user_id, scope_type, region_id, district_id, school_level, school_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, row.scope_type, row.region_id, row.district_id, row.school_level, row.school_id]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getUserScopes(userId);
}

module.exports = {
  SCOPE_TYPES,
  ROLE_BY_SCOPE,
  normalizeScopeType,
  scopeRoleName,
  getUserScopes,
  resolveSchoolIdsFromScopes,
  resolveSchoolNumbersFromScopes,
  getAllowedSchoolNumbersForUser,
  buildAccessScopeSummary,
  validateScopePayload,
  replaceUserScopes,
};