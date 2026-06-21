const express = require('express');
const { pool } = require('../config/db');
const { authenticate, requireAdministration, blockExamSupervisor } = require('../middleware/auth');
const { isAdministration } = require('../utils/auth');
const { assertCenterAccess } = require('../services/supervisorScopeService');
const { paginate, pagedResult } = require('../utils/pagination');
const { toStudentDto } = require('../utils/mappers');
const {
  getCenterSummary,
  getCenterSchools,
  getCenterStudents,
} = require('../services/examCenterScope');

const router = express.Router();

async function handleCenterSummary(level, req, res, next) {
  try {
    const centerId = Number(req.params.id);
    if (!isAdministration(req.user)) {
      const access = await assertCenterAccess(req.user, level, centerId);
      if (!access.ok) return res.status(access.status).json({ message: access.message });
    }
    const summary = await getCenterSummary(level, centerId);
    if (!summary) return res.status(404).json({ message: 'Exam center not found' });
    res.json({
      id: summary.centerId,
      centerName: summary.centerName,
      region: summary.region,
      district: summary.district,
      academicYear: summary.academicYear,
      level: summary.level === 'primary' ? 'Primary' : 'Secondary',
      schoolCount: summary.schoolCount,
      studentCount: summary.studentCount,
    });
  } catch (err) {
    next(err);
  }
}

async function handleCenterSchools(level, req, res, next) {
  try {
    const centerId = Number(req.params.id);
    if (!isAdministration(req.user)) {
      const access = await assertCenterAccess(req.user, level, centerId);
      if (!access.ok) return res.status(access.status).json({ message: access.message });
    }
    const result = await getCenterSchools(level, centerId, req.query.search);
    if (!result) return res.status(404).json({ message: 'Exam center not found' });
    res.json(result.schools);
  } catch (err) {
    next(err);
  }
}

async function handleCenterStudents(level, req, res, next) {
  try {
    const centerId = Number(req.params.id);
    if (!isAdministration(req.user)) {
      const access = await assertCenterAccess(req.user, level, centerId);
      if (!access.ok) return res.status(access.status).json({ message: access.message });
    }
    const { page, pageSize, offset } = paginate(req.query.page, req.query.pageSize);
    const result = await getCenterStudents(level, centerId, {
      page,
      pageSize,
      offset,
      search: req.query.search,
      schoolId: req.query.schoolId ? Number(req.query.schoolId) : undefined,
    });
    if (!result) return res.status(404).json({ message: 'Exam center not found' });
    res.json(
      pagedResult(
        result.rows.map(toStudentDto),
        result.totalCount,
        page,
        pageSize
      )
    );
  } catch (err) {
    next(err);
  }
}

router.get('/primary', authenticate, blockExamSupervisor, async (req, res, next) => {
  try {
    const { search, region, academicYear } = req.query;
    let sql = 'SELECT * FROM primary_exam_centers WHERE is_active = 1';
    const params = [];

    if (region?.trim()) {
      sql += ' AND region = ?';
      params.push(region.trim());
    }
    if (academicYear?.trim()) {
      sql += ' AND academic_year = ?';
      params.push(academicYear.trim());
    }
    if (search?.trim()) {
      sql += ' AND center_name LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    sql += ' ORDER BY region, center_name';
    const [rows] = await pool.query(sql, params);
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        centerName: r.center_name,
        region: r.region,
        regionId: r.region_id ? Number(r.region_id) : null,
        district: r.district,
        academicYear: r.academic_year,
        schoolCount: Number(r.school_count),
        level: 'Primary',
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/secondary', authenticate, blockExamSupervisor, async (req, res, next) => {
  try {
    const { search, region, academicYear } = req.query;
    let sql = `
      SELECT ec.*, sch.region, sch.district, sch.school_level
      FROM exam_centers ec
      INNER JOIN schools_management sch ON ec.school_id = sch.school_id
      WHERE ec.deleted_at IS NULL
        AND sch.school_level IN ('Secondary', 'Technical TVET')
    `;
    const params = [];

    if (region?.trim()) {
      sql += ' AND sch.region = ?';
      params.push(region.trim());
    }
    if (academicYear?.trim()) {
      sql += ' AND ec.academic_year = ?';
      params.push(academicYear.trim());
    }
    if (search?.trim()) {
      sql += ' AND ec.center_name LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    sql += ' ORDER BY sch.region, ec.center_name';
    const [rows] = await pool.query(sql, params);
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        centerName: r.center_name,
        schoolId: Number(r.school_id),
        schoolNumber: r.school_number,
        region: r.region,
        district: r.district,
        academicYear: r.academic_year,
        schoolLevel: r.school_level,
        rollSerialStart: r.roll_serial_start,
        rollSerialEnd: r.roll_serial_end,
        level: 'Secondary',
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/primary/:id/summary', authenticate, (req, res, next) =>
  handleCenterSummary('primary', req, res, next)
);
router.get('/primary/:id/schools', authenticate, (req, res, next) =>
  handleCenterSchools('primary', req, res, next)
);
router.get('/primary/:id/students', authenticate, (req, res, next) =>
  handleCenterStudents('primary', req, res, next)
);

router.get('/secondary/:id/summary', authenticate, (req, res, next) =>
  handleCenterSummary('secondary', req, res, next)
);
router.get('/secondary/:id/schools', authenticate, (req, res, next) =>
  handleCenterSchools('secondary', req, res, next)
);
router.get('/secondary/:id/students', authenticate, (req, res, next) =>
  handleCenterStudents('secondary', req, res, next)
);

router.post('/primary/sync', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const academicYear = (req.body.academicYear || '2025/2026').trim();
    const [result] = await pool.query(
      `INSERT INTO primary_exam_centers (center_name, region, region_id, district, academic_year, school_count)
       SELECT
         TRIM(s.exam_center_name),
         NULLIF(TRIM(s.region), ''),
         s.region_id,
         NULLIF(TRIM(s.district), ''),
         ?,
         COUNT(*)
       FROM schools_management s
       WHERE s.school_level = 'Primary'
         AND s.exam_center_name IS NOT NULL
         AND TRIM(s.exam_center_name) != ''
       GROUP BY TRIM(s.exam_center_name), NULLIF(TRIM(s.region), ''), s.region_id, NULLIF(TRIM(s.district), '')
       ON DUPLICATE KEY UPDATE
         school_count = VALUES(school_count),
         updated_at = CURRENT_TIMESTAMP`,
      [academicYear]
    );
    res.json({ message: 'Primary exam centers synced', affectedRows: result.affectedRows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
