const { pool } = require('../config/db');
const { isFullAdmin } = require('../utils/auth');
const {
  getAllowedSchoolNumbersForUser,
  resolveSchoolIdsFromScopes,
  getUserScopes,
} = require('./userScopeService');

function regionMatchClause(alias, regionId) {
  return {
    sql: ` AND (${alias}.region_id = ? OR TRIM(${alias}.region) = (
      SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1
    ))`,
    params: [Number(regionId), Number(regionId)],
  };
}

function buildScopeFilterClause(scopes, alias = 's') {
  if (!scopes.length) return { sql: ' AND 1=0', params: [] };

  const parts = [];
  const params = [];

  for (const scope of scopes) {
    if (scope.scopeType === 'region' && scope.regionId) {
      const clause = regionMatchClause(alias, scope.regionId);
      parts.push(`(${clause.sql.trim().replace(/^AND\s+/, '')})`);
      params.push(...clause.params);
      continue;
    }

    if (scope.scopeType === 'district' && scope.districtId) {
      parts.push(`(
        TRIM(${alias}.district) = (
          SELECT TRIM(district_name) FROM districts WHERE district_id = ? LIMIT 1
        )
        AND (
          ${alias}.region_id = (SELECT region_id FROM districts WHERE district_id = ? LIMIT 1)
          OR TRIM(${alias}.region) = (
            SELECT TRIM(r.region_name)
            FROM districts d
            INNER JOIN regions r ON r.region_id = d.region_id
            WHERE d.district_id = ? LIMIT 1
          )
        )
      )`);
      params.push(Number(scope.districtId), Number(scope.districtId), Number(scope.districtId));
      continue;
    }

    if (scope.scopeType === 'school_level' && scope.schoolLevel) {
      let sql = `TRIM(${alias}.school_level) = TRIM(?)`;
      const levelParams = [scope.schoolLevel];
      if (scope.districtId) {
        sql += ` AND TRIM(${alias}.district) = (
          SELECT TRIM(district_name) FROM districts WHERE district_id = ? LIMIT 1
        )`;
        levelParams.push(Number(scope.districtId));
      } else if (scope.regionId) {
        const regionClause = regionMatchClause(alias, scope.regionId);
        sql += regionClause.sql;
        levelParams.push(...regionClause.params);
      }
      parts.push(`(${sql})`);
      params.push(...levelParams);
      continue;
    }

    if (scope.scopeType === 'school' && scope.schoolId) {
      parts.push(`${alias}.school_id = ?`);
      params.push(Number(scope.schoolId));
    }
  }

  if (!parts.length) return { sql: ' AND 1=0', params: [] };
  return { sql: ` AND (${parts.join(' OR ')})`, params };
}

/** Scope filter for students_management when schools are not joined. */
function studentSchoolFilterClause(access) {
  if (access === null) return { sql: '', params: [] };
  if (access.scopes?.length) {
    const inner = buildScopeFilterClause(access.scopes, 'sch');
    return {
      sql: ` AND s.school_id IN (SELECT sch.school_id FROM schools_management sch WHERE 1=1${inner.sql})`,
      params: inner.params,
    };
  }
  return schoolFilterClause(access, 's');
}

async function getAllowedSchoolAccess(user) {
  if (isFullAdmin(user)) return null;

  const numbers = await getAllowedSchoolNumbersForUser(user);
  if (numbers === null) return null;

  const userId = Number(user?.id);
  if (!userId) return { schoolIds: [], schoolNumbers: [] };

  const scopes = await getUserScopes(userId);
  if (scopes.length) {
    return { scopes, schoolIds: await resolveSchoolIdsFromScopes(scopes), schoolNumbers: numbers };
  }

  if (user.groupId) {
    const [rows] = await pool.query(
      'SELECT school_id FROM schools_management WHERE school_number IN (SELECT school_number FROM group_school_assignments WHERE group_id = ?)',
      [user.groupId]
    );
    return {
      schoolIds: rows.map((r) => Number(r.school_id)),
      schoolNumbers: numbers,
    };
  }

  return { schoolIds: [], schoolNumbers: numbers };
}

async function getAllowedSchoolNumbers(user) {
  const access = await getAllowedSchoolAccess(user);
  if (access === null) return null;
  return access.schoolNumbers;
}

function schoolFilterClause(access, alias = 's') {
  if (access === null) return { sql: '', params: [] };

  if (Array.isArray(access)) {
    return schoolFilterClause({ schoolIds: [], schoolNumbers: access }, alias);
  }

  if (access.scopes?.length) {
    return buildScopeFilterClause(access.scopes, alias);
  }

  const schoolIds = access.schoolIds || [];
  const schoolNumbers = access.schoolNumbers || [];

  if (!schoolIds.length && !schoolNumbers.length) {
    return { sql: ' AND 1=0', params: [] };
  }

  const parts = [];
  const params = [];

  if (schoolIds.length) {
    parts.push(`${alias}.school_id IN (${schoolIds.map(() => '?').join(',')})`);
    params.push(...schoolIds);
  }
  if (schoolNumbers.length) {
    parts.push(`${alias}.school_number IN (${schoolNumbers.map(() => '?').join(',')})`);
    params.push(...schoolNumbers);
  }

  return { sql: ` AND (${parts.join(' OR ')})`, params };
}

async function canAccessSchool(user, schoolNumber, schoolId = null) {
  if (isFullAdmin(user)) return true;
  const access = await getAllowedSchoolAccess(user);
  if (!access) return true;

  if (access.scopes?.length) {
    let sql = 'SELECT school_id FROM schools_management s WHERE 1=1';
    const filter = buildScopeFilterClause(access.scopes, 's');
    sql += filter.sql;
    const params = [...filter.params];
    if (schoolId != null) {
      sql += ' AND s.school_id = ?';
      params.push(Number(schoolId));
    } else if (schoolNumber) {
      sql += ' AND s.school_number = ?';
      params.push(schoolNumber);
    }
    const [rows] = await pool.query(`${sql} LIMIT 1`, params);
    return rows.length > 0;
  }

  if (schoolId != null && access.schoolIds.includes(Number(schoolId))) return true;
  if (schoolNumber && access.schoolNumbers.includes(schoolNumber)) return true;

  if (schoolNumber) {
    const [rows] = await pool.query(
      'SELECT school_id FROM schools_management WHERE school_number = ? LIMIT 1',
      [schoolNumber]
    );
    if (rows.length && access.schoolIds.includes(Number(rows[0].school_id))) return true;
  }

  return false;
}

module.exports = {
  getAllowedSchoolAccess,
  getAllowedSchoolNumbers,
  schoolFilterClause,
  canAccessSchool,
  buildScopeFilterClause,
  regionMatchClause,
  studentSchoolFilterClause,
};