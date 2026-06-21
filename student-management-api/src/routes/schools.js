const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../utils/auth');
const {
  getAllowedSchoolAccess,
  schoolFilterClause,
  canAccessSchool,
} = require('../services/userSchoolAccess');

const router = express.Router();

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

function appendSchoolFilters(query, sql, params) {
  let nextSql = sql;
  const nextParams = [...params];

  if (query.regionId) {
    const rid = Number(query.regionId);
    nextSql += ` AND (s.region_id = ? OR TRIM(s.region) = (
      SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1
    ))`;
    nextParams.push(rid, rid);
  } else if (query.region && String(query.region).trim()) {
    nextSql += ' AND s.region = ?';
    nextParams.push(String(query.region).trim());
  }

  if (query.level && String(query.level).trim()) {
    const level = String(query.level).trim();
    if (level === 'Unspecified') {
      nextSql += " AND (s.school_level IS NULL OR TRIM(s.school_level) = '')";
    } else {
      nextSql += ' AND TRIM(s.school_level) = ?';
      nextParams.push(level);
    }
  }

  return { sql: nextSql, params: nextParams };
}

router.get('/levels', authenticate, async (req, res, next) => {
  try {
    let sql = 'SELECT DISTINCT COALESCE(NULLIF(TRIM(s.school_level), \'\'), \'Unspecified\') AS level FROM schools_management s WHERE 1=1';
    const params = [];

    const access = await getAllowedSchoolAccess(req.user);
    const filter = schoolFilterClause(access, 's');
    sql += filter.sql;
    params.push(...filter.params);

    sql += ' ORDER BY level';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map((r) => r.level));
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search } = req.query;
    let sql = `SELECT s.*,
      (SELECT COUNT(*) FROM students_management st
       WHERE st.school_id = s.school_id AND st.deleted_at IS NULL) AS student_count
      FROM schools_management s WHERE 1=1`;
    const params = [];

    const access = await getAllowedSchoolAccess(req.user);
    const filter = schoolFilterClause(access, 's');
    sql += filter.sql;
    params.push(...filter.params);

    const filtered = appendSchoolFilters(req.query, sql, params);
    sql = filtered.sql;
    params.length = 0;
    params.push(...filtered.params);

    if (search && String(search).trim()) {
      sql += ' AND (s.school_name LIKE ? OR s.school_number LIKE ?)';
      const term = `%${String(search).trim()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY s.region, s.school_level, s.school_name';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toSchoolDto));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM students_management st
         WHERE st.school_id = s.school_id AND st.deleted_at IS NULL) AS student_count
       FROM schools_management s
       WHERE s.school_id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'School not found' });

    const school = rows[0];
    if (!isAdmin(req.user)) {
      const allowed = await canAccessSchool(req.user, school.school_number);
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(toSchoolDto(school));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/classes', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [schools] = await pool.query(
      'SELECT * FROM schools_management WHERE school_id = ? LIMIT 1',
      [id]
    );
    if (!schools.length) return res.status(404).json({ message: 'School not found' });

    const school = schools[0];
    if (!isAdmin(req.user)) {
      const allowed = await canAccessSchool(req.user, school.school_number);
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    }

    const [classes] = await pool.query(
      `SELECT * FROM school_classes
       WHERE school_id = ? OR school_number = ?
       ORDER BY class_name`,
      [id, school.school_number]
    );

    res.json(
      classes.map((c) => ({
        auto: Number(c.id),
        schoolId: c.school_id ? Number(c.school_id) : id,
        classId: c.class_code,
        section: c.grade_level,
        shift: c.shift,
        year: c.academic_year,
      }))
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
