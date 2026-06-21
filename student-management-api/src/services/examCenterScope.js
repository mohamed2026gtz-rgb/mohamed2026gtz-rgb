const { pool } = require('../config/db');

async function getPrimaryCenterContext(centerId) {
  const [rows] = await pool.query(
    'SELECT * FROM primary_exam_centers WHERE id = ? AND is_active = 1 LIMIT 1',
    [centerId]
  );
  if (!rows.length) return null;
  const c = rows[0];
  return {
    level: 'primary',
    centerId: Number(c.id),
    centerName: c.center_name,
    region: c.region || null,
    district: c.district || null,
    academicYear: c.academic_year,
  };
}

async function getSecondaryCenterContext(centerId) {
  const [rows] = await pool.query(
    `SELECT ec.id, ec.center_name, ec.academic_year, sch.region
     FROM exam_centers ec
     INNER JOIN schools_management sch ON ec.school_id = sch.school_id
     WHERE ec.id = ? AND ec.deleted_at IS NULL
     LIMIT 1`,
    [centerId]
  );
  if (!rows.length) return null;
  const c = rows[0];
  return {
    level: 'secondary',
    centerId: Number(c.id),
    centerName: c.center_name,
    region: c.region || null,
    district: null,
    academicYear: c.academic_year,
  };
}

function primarySchoolFilter(ctx, alias = 's') {
  let sql = `${alias}.school_level = 'Primary'
    AND TRIM(${alias}.exam_center_name) = TRIM(?)`;
  const params = [ctx.centerName];
  if (ctx.region) {
    sql += ` AND ${alias}.region = ?`;
    params.push(ctx.region);
  }
  if (ctx.district) {
    sql += ` AND ${alias}.district = ?`;
    params.push(ctx.district);
  }
  return { sql, params };
}

function secondarySchoolFilter(ctx) {
  const sql = `sch.school_level IN ('Secondary', 'Technical TVET')
    AND ec.deleted_at IS NULL
    AND TRIM(ec.center_name) = TRIM(?)
    AND sch.region = ?`;
  const params = [ctx.centerName, ctx.region];
  return { sql, params };
}

function toSchoolDto(row) {
  return {
    schoolId: Number(row.school_id),
    schoolNumber: row.school_number,
    schoolName: row.school_name,
    region: row.region,
    regionId: row.region_id ? Number(row.region_id) : null,
    district: row.district,
    schoolLevel: row.school_level || null,
    studentCount: row.student_count != null ? Number(row.student_count) : undefined,
    isActive: true,
  };
}

async function getCenterContext(level, centerId) {
  return level === 'secondary'
    ? getSecondaryCenterContext(centerId)
    : getPrimaryCenterContext(centerId);
}

async function getCenterSummary(level, centerId) {
  const ctx = await getCenterContext(level, centerId);
  if (!ctx) return null;

  if (ctx.level === 'primary') {
    const { sql, params } = primarySchoolFilter(ctx);
    const [[counts]] = await pool.query(
      `SELECT
         COUNT(DISTINCT s.school_id) AS schoolCount,
         COUNT(st.id) AS studentCount
       FROM schools_management s
       LEFT JOIN students_management st
         ON st.school_id = s.school_id AND st.deleted_at IS NULL
       WHERE ${sql}`,
      params
    );
    return {
      ...ctx,
      schoolCount: Number(counts.schoolCount),
      studentCount: Number(counts.studentCount),
    };
  }

  const { sql, params } = secondarySchoolFilter(ctx);
  const [[counts]] = await pool.query(
    `SELECT
       COUNT(DISTINCT sch.school_id) AS schoolCount,
       COUNT(st.id) AS studentCount
     FROM exam_centers ec
     INNER JOIN schools_management sch ON ec.school_id = sch.school_id
     LEFT JOIN students_management st
       ON st.school_id = sch.school_id AND st.deleted_at IS NULL
     WHERE ${sql}`,
    params
  );
  return {
    ...ctx,
    schoolCount: Number(counts.schoolCount),
    studentCount: Number(counts.studentCount),
  };
}

async function getCenterSchools(level, centerId, search) {
  const ctx = await getCenterContext(level, centerId);
  if (!ctx) return null;

  if (ctx.level === 'primary') {
    const { sql, params } = primarySchoolFilter(ctx);
    let query = `SELECT s.*,
      (SELECT COUNT(*) FROM students_management st
       WHERE st.school_id = s.school_id AND st.deleted_at IS NULL) AS student_count
      FROM schools_management s
      WHERE ${sql}`;
    const queryParams = [...params];
    if (search?.trim()) {
      query += ' AND (s.school_name LIKE ? OR s.school_number LIKE ?)';
      const term = `%${search.trim()}%`;
      queryParams.push(term, term);
    }
    query += ' ORDER BY s.school_name';
    const [rows] = await pool.query(query, queryParams);
    return { ctx, schools: rows.map(toSchoolDto) };
  }

  const { sql, params } = secondarySchoolFilter(ctx);
  let query = `SELECT DISTINCT sch.*,
    (SELECT COUNT(*) FROM students_management st
     WHERE st.school_id = sch.school_id AND st.deleted_at IS NULL) AS student_count
    FROM exam_centers ec
    INNER JOIN schools_management sch ON ec.school_id = sch.school_id
    WHERE ${sql}`;
  const queryParams = [...params];
  if (search?.trim()) {
    query += ' AND (sch.school_name LIKE ? OR sch.school_number LIKE ?)';
    const term = `%${search.trim()}%`;
    queryParams.push(term, term);
  }
  query += ' ORDER BY sch.school_name';
  const [rows] = await pool.query(query, queryParams);
  return { ctx, schools: rows.map(toSchoolDto) };
}

async function getCenterStudents(level, centerId, { page, pageSize, offset, search, schoolId }) {
  const ctx = await getCenterContext(level, centerId);
  if (!ctx) return null;

  let fromSql;
  let params;

  if (ctx.level === 'primary') {
    const filter = primarySchoolFilter(ctx, 'sch');
    fromSql = `FROM students_management st
      INNER JOIN schools_management sch ON st.school_id = sch.school_id
      WHERE st.deleted_at IS NULL AND ${filter.sql}`;
    params = [...filter.params];
  } else {
    const filter = secondarySchoolFilter(ctx);
    fromSql = `FROM students_management st
      INNER JOIN schools_management sch ON st.school_id = sch.school_id
      INNER JOIN exam_centers ec ON ec.school_id = sch.school_id
      WHERE st.deleted_at IS NULL AND ${filter.sql}`;
    params = [...filter.params];
  }

  if (schoolId) {
    fromSql += ' AND st.school_id = ?';
    params.push(Number(schoolId));
  }

  if (search?.trim()) {
    fromSql += ' AND (st.unique_id LIKE ? OR st.student_no LIKE ? OR st.student_name LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const [[{ totalCount }]] = await pool.query(
    `SELECT COUNT(DISTINCT st.id) AS totalCount ${fromSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT DISTINCT st.*, sch.school_name AS joined_school_name,
       sch.region AS joined_region, sch.school_level AS joined_school_level
     ${fromSql}
     ORDER BY st.student_name
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { ctx, rows, totalCount: Number(totalCount) };
}

async function findCenterStudent(level, centerId, loginId) {
  const ctx = await getCenterContext(level, centerId);
  if (!ctx) return null;

  const term = String(loginId || '').trim();
  if (!term) return null;

  let fromSql;
  let params;

  if (ctx.level === 'primary') {
    const filter = primarySchoolFilter(ctx, 'sch');
    fromSql = `FROM students_management st
      INNER JOIN schools_management sch ON st.school_id = sch.school_id
      WHERE st.deleted_at IS NULL AND ${filter.sql}
        AND (st.unique_id = ? OR st.student_no = ?)`;
    params = [...filter.params, term, term];
  } else {
    const filter = secondarySchoolFilter(ctx);
    fromSql = `FROM students_management st
      INNER JOIN schools_management sch ON st.school_id = sch.school_id
      INNER JOIN exam_centers ec ON ec.school_id = sch.school_id
      WHERE st.deleted_at IS NULL AND ${filter.sql}
        AND (st.unique_id = ? OR st.student_no = ?)`;
    params = [...filter.params, term, term];
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT st.*, sch.school_name AS joined_school_name,
       sch.region AS joined_region, sch.school_level AS joined_school_level
     ${fromSql}
     LIMIT 1`,
    params
  );

  return rows.length ? { ctx, row: rows[0] } : null;
}

module.exports = {
  getCenterContext,
  getCenterSummary,
  getCenterSchools,
  getCenterStudents,
  findCenterStudent,
  primarySchoolFilter,
  secondarySchoolFilter,
};
