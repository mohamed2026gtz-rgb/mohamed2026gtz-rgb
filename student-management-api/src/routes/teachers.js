const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../utils/auth');
const { paginate, pagedResult } = require('../utils/pagination');
const {
  getAllowedSchoolAccess,
  schoolFilterClause,
  canAccessSchool,
} = require('../services/userSchoolAccess');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, offset } = paginate(req.query.page, req.query.pageSize);
    const { search, schoolId } = req.query;

    let sql = `FROM schools_management s
      WHERE s.head_teacher IS NOT NULL AND s.head_teacher != ''`;
    const params = [];

    const allowed = await getAllowedSchoolAccess(req.user);
    const filter = schoolFilterClause(allowed, 's');
    sql += filter.sql;
    params.push(...filter.params);

    if (schoolId) {
      sql += ' AND s.school_id = ?';
      params.push(Number(schoolId));
    }

    if (search && String(search).trim()) {
      sql += ' AND s.head_teacher LIKE ?';
      params.push(`%${String(search).trim()}%`);
    }

    const groupedSql = `SELECT
        MIN(s.school_id) AS auto,
        MIN(s.school_id) AS school_id,
        s.head_teacher AS full_name,
        MIN(s.telephone) AS telephone
      ${sql}
      GROUP BY s.head_teacher`;

    const [[{ totalCount }]] = await pool.query(
      `SELECT COUNT(*) AS totalCount FROM (${groupedSql}) t`,
      params
    );

    const [rows] = await pool.query(
      `${groupedSql} ORDER BY s.head_teacher LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const items = rows.map((r) => ({
      auto: Number(r.auto),
      schoolId: String(r.school_id),
      firstName: null,
      secondName: null,
      thirdName: null,
      fourthName: null,
      fullName: r.full_name,
      sex: null,
      telephone: r.telephone,
      title: 'Head Teacher',
      teacherId: null,
      majorSubject: null,
    }));

    res.json(pagedResult(items, Number(totalCount), page, pageSize));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT * FROM schools_management
       WHERE school_id = ? AND head_teacher IS NOT NULL AND head_teacher != ''
       LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });

    const school = rows[0];
    if (!isAdmin(req.user)) {
      const allowed = await canAccessSchool(req.user, school.school_number);
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({
      auto: Number(school.school_id),
      schoolId: String(school.school_id),
      fullName: school.head_teacher,
      title: 'Head Teacher',
      telephone: school.telephone,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
