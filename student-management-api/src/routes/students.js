const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../utils/auth');
const { paginate, pagedResult } = require('../utils/pagination');
const { toStudentDto, toChangeHistoryDto } = require('../utils/mappers');
const fs = require('fs');
const {
  resolveImageFile,
  photoContentType,
  hasStudentPicture,
} = require('../utils/imagePath');
const {
  getAllowedSchoolAccess,
  schoolFilterClause,
  canAccessSchool,
} = require('../services/userSchoolAccess');

const router = express.Router();

async function findStudent(uniqueId, user) {
  const [rows] = await pool.query(
    'SELECT * FROM students_management WHERE unique_id = ? AND deleted_at IS NULL LIMIT 1',
    [uniqueId]
  );
  if (!rows.length) return null;

  const student = rows[0];
  if (!isAdmin(user)) {
    const allowed = await canAccessSchool(user, student.school_number);
    if (!allowed) return null;
  }
  return student;
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, offset } = paginate(req.query.page, req.query.pageSize);
    const { search, classId, schoolId, searchAllSchools, region, regionId, level } =
      req.query;
    const admin = isAdmin(req.user);
    const crossSchool =
      admin && searchAllSchools === 'true' && search && String(search).trim();
    let sql = 'FROM students_management s INNER JOIN schools_management sch ON s.school_id = sch.school_id WHERE s.deleted_at IS NULL';
    const params = [];
    const selectCols = `s.*, sch.school_name AS joined_school_name, sch.region AS joined_region, sch.school_level AS joined_school_level,
      COALESCE(NULLIF(TRIM(sch.exam_center_name), ''),
        (SELECT ec.center_name FROM exam_centers ec WHERE ec.school_id = sch.school_id AND ec.deleted_at IS NULL LIMIT 1)
      ) AS joined_exam_center_name`;

    if (!crossSchool) {
      const access = await getAllowedSchoolAccess(req.user);
      const filter = schoolFilterClause(access, 'sch');
      sql += filter.sql;
      params.push(...filter.params);

      if (schoolId) {
        sql += ' AND s.school_id = ?';
        params.push(Number(schoolId));
      }
    }

    if (regionId) {
      sql += ` AND (sch.region_id = ? OR TRIM(sch.region) = (
        SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1
      ))`;
      params.push(Number(regionId), Number(regionId));
    } else if (region && String(region).trim()) {
      sql += ' AND sch.region = ?';
      params.push(String(region).trim());
    }

    if (level && String(level).trim()) {
      const schoolLevel = String(level).trim();
      if (schoolLevel === 'Unspecified') {
        sql += " AND (sch.school_level IS NULL OR TRIM(sch.school_level) = '')";
      } else {
        sql += ' AND TRIM(sch.school_level) = ?';
        params.push(schoolLevel);
      }
    }

    if (classId) {
      sql += ' AND s.class_id = ?';
      params.push(classId);
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      if (crossSchool) {
        sql += ' AND s.unique_id = ?';
        params.push(term);
      } else {
        sql += ' AND (s.unique_id LIKE ? OR s.student_no LIKE ? OR s.student_name LIKE ?)';
        const like = `%${term}%`;
        params.push(like, like, like);
      }
    }

    const [[{ totalCount }]] = await pool.query(
      `SELECT COUNT(*) AS totalCount ${sql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT ${selectCols} ${sql} ORDER BY s.student_name LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json(
      pagedResult(rows.map(toStudentDto), Number(totalCount), page, pageSize)
    );
  } catch (err) {
    next(err);
  }
});

router.get('/:studentNo', authenticate, async (req, res, next) => {
  try {
    const student = await findStudent(req.params.studentNo, req.user);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(toStudentDto(student));
  } catch (err) {
    next(err);
  }
});

router.get('/:studentNo/photo', authenticate, async (req, res, next) => {
  try {
    const student = await findStudent(req.params.studentNo, req.user);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!hasStudentPicture(student)) {
      return res.status(404).json({ message: 'Student has no picture on record' });
    }
    const filePath = resolveImageFile(student.image_url);
    if (!filePath) {
      return res.status(404).json({
        message:
          'Picture file not reachable from API server. Ensure the network share is accessible.',
      });
    }
    res.setHeader('Content-Type', photoContentType(filePath));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({
          message: `Cannot read picture from share \\\\${process.env.IMAGE_SHARE_HOST || '192.168.20.90'}`,
        });
      }
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get('/:studentNo/transcript', authenticate, async (req, res, next) => {
  try {
    const student = await findStudent(req.params.studentNo, req.user);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const [history] = await pool.query(
      `SELECT * FROM student_change_history
       WHERE student_unique_id = ?
       ORDER BY created_at DESC`,
      [student.unique_id]
    );

    const dto = toStudentDto(student);
    res.json({
      studentNo: student.unique_id,
      studentName: dto.fullName,
      schoolId: Number(student.school_id),
      classId: student.class_id,
      primaryRecords: [],
      secondaryRecords: [],
      enrollmentHistory: history.map(toChangeHistoryDto),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, (req, res) => {
  res.status(501).json({
    message: 'Create student is not enabled via mobile API.',
  });
});

router.put('/:studentNo', authenticate, (req, res) => {
  res.status(501).json({
    message: 'Update student is not enabled via mobile API.',
  });
});

router.delete('/:studentNo', authenticate, (req, res) => {
  res.status(501).json({
    message: 'Delete student is not enabled via mobile API.',
  });
});

module.exports = router;
