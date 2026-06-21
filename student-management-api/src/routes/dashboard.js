const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const {
  getAllowedSchoolAccess,
  schoolFilterClause,
  studentSchoolFilterClause,
} = require('../services/userSchoolAccess');
const { getAdminAttendanceStats } = require('../services/attendanceStatsService');

const router = express.Router();

function mapLevelRows(rows, labelKey = 'level') {
  return rows.map((r) => ({
    level: r[labelKey] || 'Unspecified',
    count: Number(r.count),
  }));
}

router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    const allowed = await getAllowedSchoolAccess(req.user);

    let studentSql = 'FROM students_management s WHERE s.deleted_at IS NULL';
    let schoolSql = 'FROM schools_management s WHERE 1=1';
    const studentParams = [];
    const schoolParams = [];

    const studentFilter = studentSchoolFilterClause(allowed);
    studentSql += studentFilter.sql;
    studentParams.push(...studentFilter.params);

    const schoolFilter = schoolFilterClause(allowed, 's');
    schoolSql += schoolFilter.sql;
    schoolParams.push(...schoolFilter.params);

    if (schoolId) {
      studentSql += ' AND s.school_id = ?';
      studentParams.push(Number(schoolId));
      schoolSql += ' AND s.school_id = ?';
      schoolParams.push(Number(schoolId));
    }

    const [[{ totalStudents }]] = await pool.query(
      `SELECT COUNT(*) AS totalStudents ${studentSql}`,
      studentParams
    );

    const [[{ totalSchools }]] = await pool.query(
      `SELECT COUNT(*) AS totalSchools ${schoolSql}`,
      schoolParams
    );

    const [[{ totalTeachers }]] = await pool.query(
      `SELECT COUNT(DISTINCT s.head_teacher) AS totalTeachers
       ${schoolSql} AND s.head_teacher IS NOT NULL AND s.head_teacher != ''`,
      schoolParams
    );

    const [schoolsByLevel] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(s.school_level), ''), 'Unspecified') AS level,
              COUNT(*) AS count
       ${schoolSql}
       GROUP BY COALESCE(NULLIF(TRIM(s.school_level), ''), 'Unspecified')
       ORDER BY count DESC`,
      schoolParams
    );

    const [studentsByLevel] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(s.level), ''), 'Unspecified') AS level,
              COUNT(*) AS count
       ${studentSql}
       GROUP BY COALESCE(NULLIF(TRIM(s.level), ''), 'Unspecified')
       ORDER BY count DESC`,
      studentParams
    );

    const studentJoinSql =
      'FROM students_management s INNER JOIN schools_management sch ON s.school_id = sch.school_id WHERE s.deleted_at IS NULL';
    let studentJoinWhere = '';
    const studentJoinParams = [];

    const studentJoinFilter = schoolFilterClause(allowed, 'sch');
    studentJoinWhere += studentJoinFilter.sql;
    studentJoinParams.push(...studentJoinFilter.params);

    if (schoolId) {
      studentJoinWhere += ' AND s.school_id = ?';
      studentJoinParams.push(Number(schoolId));
    }

    const [studentsBySchoolLevel] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified') AS level,
              COUNT(*) AS count
       ${studentJoinSql}${studentJoinWhere}
       GROUP BY COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified')
       ORDER BY count DESC`,
      studentJoinParams
    );

    const pictureFilter =
      " AND (s.image_status = 'has_image' OR (s.image_url IS NOT NULL AND TRIM(s.image_url) != ''))";

    const [[{ studentsWithPicture }]] = await pool.query(
      `SELECT COUNT(*) AS studentsWithPicture ${studentSql}${pictureFilter}`,
      studentParams
    );

    const [studentsWithPictureByLevel] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(s.level), ''), 'Unspecified') AS level,
              COUNT(*) AS count
       ${studentSql}${pictureFilter}
       GROUP BY COALESCE(NULLIF(TRIM(s.level), ''), 'Unspecified')
       ORDER BY count DESC`,
      studentParams
    );

    const [studentsWithPictureBySchoolLevel] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified') AS level,
              COUNT(*) AS count
       ${studentJoinSql}${studentJoinWhere}${pictureFilter}
       GROUP BY COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified')
       ORDER BY count DESC`,
      studentJoinParams
    );

    const [regionsSummary] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(sch.region), ''), 'Unspecified') AS region,
              COUNT(DISTINCT sch.school_id) AS schoolCount,
              COUNT(s.id) AS studentCount
       ${studentJoinSql}${studentJoinWhere}
       GROUP BY COALESCE(NULLIF(TRIM(sch.region), ''), 'Unspecified')
       ORDER BY studentCount DESC`,
      studentJoinParams
    );

    const [schoolLevels] = await pool.query(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(s.school_level), ''), 'Unspecified') AS level
       ${schoolSql}
       ORDER BY level`,
      schoolParams
    );

    res.json({
      totalStudents: Number(totalStudents),
      totalTeachers: Number(totalTeachers),
      totalSchools: Number(totalSchools),
      presentToday: 0,
      absentToday: 0,
      studentsWithPicture: Number(studentsWithPicture),
      schoolsByLevel: mapLevelRows(schoolsByLevel),
      studentsByLevel: mapLevelRows(studentsByLevel),
      studentsBySchoolLevel: mapLevelRows(studentsBySchoolLevel),
      studentsWithPictureByLevel: mapLevelRows(studentsWithPictureByLevel),
      studentsWithPictureBySchoolLevel: mapLevelRows(studentsWithPictureBySchoolLevel),
      regionsSummary: regionsSummary.map((r) => ({
        region: r.region,
        schoolCount: Number(r.schoolCount),
        studentCount: Number(r.studentCount),
      })),
      schoolLevels: schoolLevels.map((r) => r.level),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/attendance-stats', authenticate, async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    const stats = await getAdminAttendanceStats(req.user, schoolId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
