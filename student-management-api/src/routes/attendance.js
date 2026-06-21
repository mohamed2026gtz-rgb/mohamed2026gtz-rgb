const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { isExamSupervisor, isAdministration } = require('../utils/auth');
const {
  getSupervisorAssignment,
  studentsBelongToCenter,
} = require('../services/supervisorScopeService');

const router = express.Router();

const VALID_STATUSES = new Set(['Present', 'Absent', 'Late', 'Excused']);

function toAttendanceDto(row) {
  const date =
    row.attendance_date instanceof Date
      ? row.attendance_date.toISOString().slice(0, 10)
      : String(row.attendance_date).slice(0, 10);
  return {
    studentNo: row.student_unique_id,
    subject: row.subject,
    attendanceDate: date,
    status: row.status,
    notes: row.notes || undefined,
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : new Date().toISOString(),
  };
}

function parseStudentNos(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function presentToStatus(present) {
  return present === false || present === 'false' || present === 0 ? 'Absent' : 'Present';
}

async function validateSupervisorAttendance(req, studentNos) {
  if (isAdministration(req.user) || !isExamSupervisor(req.user)) {
    return { ok: true };
  }
  const assignment = await getSupervisorAssignment(req.user);
  if (!assignment) {
    return {
      ok: false,
      status: 403,
      message: 'No exam center assignment — contact administration',
    };
  }
  const check = await studentsBelongToCenter(
    assignment.level,
    assignment.centerId,
    studentNos
  );
  if (!check.ok) {
    return {
      ok: false,
      status: 403,
      message: `Some students are not in your assigned exam center: ${check.invalid.slice(0, 5).join(', ')}`,
    };
  }
  return { ok: true, assignment };
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { subject, attendanceDate, studentNo } = req.query;
    let sql = 'SELECT * FROM student_exam_attendance WHERE 1=1';
    const params = [];

    if (subject?.trim()) {
      sql += ' AND subject = ?';
      params.push(subject.trim());
    }
    if (attendanceDate?.trim()) {
      sql += ' AND attendance_date = ?';
      params.push(attendanceDate.trim());
    }
    if (studentNo?.trim()) {
      sql += ' AND student_unique_id = ?';
      params.push(studentNo.trim());
    }

    sql += ' ORDER BY attendance_date DESC, subject, student_unique_id LIMIT 500';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toAttendanceDto));
  } catch (err) {
    next(err);
  }
});

router.post('/lookup', authenticate, async (req, res, next) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const attendanceDate = String(req.body.attendanceDate || '').trim();
    const studentNos = parseStudentNos(req.body.studentNos);

    if (!subject || !attendanceDate) {
      return res.status(400).json({ message: 'subject and attendanceDate are required' });
    }
    if (!studentNos.length) {
      return res.json({ items: [] });
    }

    const placeholders = studentNos.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT * FROM student_exam_attendance
       WHERE subject = ? AND attendance_date = ?
         AND student_unique_id IN (${placeholders})`,
      [subject, attendanceDate, ...studentNos]
    );

    res.json({ items: rows.map(toAttendanceDto) });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const studentNo = String(req.body.studentNo || '').trim();
    const subject = String(req.body.subject || '').trim();
    const attendanceDate = String(req.body.attendanceDate || '').trim();
    const status = String(req.body.status || 'Present').trim();
    const notes = req.body.notes?.trim() || null;

    if (!studentNo || !subject || !attendanceDate) {
      return res
        .status(400)
        .json({ message: 'studentNo, subject, and attendanceDate are required' });
    }
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Invalid attendance status' });
    }

    const scope = await validateSupervisorAttendance(req, [studentNo]);
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    await pool.query(
      `INSERT INTO student_exam_attendance
         (student_unique_id, subject, attendance_date, status, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         notes = VALUES(notes),
         recorded_by = VALUES(recorded_by),
         updated_at = CURRENT_TIMESTAMP`,
      [studentNo, subject, attendanceDate, status, notes, req.user.id || null]
    );

    res.status(201).json({
      studentNo,
      subject,
      attendanceDate,
      status,
      notes,
      message: 'Attendance saved',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', authenticate, async (req, res, next) => {
  const subject = String(req.body.subject || '').trim();
  const attendanceDate = String(req.body.attendanceDate || '').trim();
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];

  if (!subject || !attendanceDate) {
    return res.status(400).json({ message: 'subject and attendanceDate are required' });
  }
  if (!entries.length) {
    return res.status(400).json({ message: 'entries array is required' });
  }

  const studentNos = entries.map((e) => String(e.studentNo || '').trim()).filter(Boolean);
  const scope = await validateSupervisorAttendance(req, studentNos);
  if (!scope.ok) {
    return res.status(scope.status).json({ message: scope.message });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let savedCount = 0;

    for (const entry of entries) {
      const studentNo = String(entry.studentNo || '').trim();
      if (!studentNo) continue;

      const status =
        entry.status && VALID_STATUSES.has(entry.status)
          ? entry.status
          : presentToStatus(entry.present);
      const notes = entry.notes?.trim() || null;

      await conn.query(
        `INSERT INTO student_exam_attendance
           (student_unique_id, subject, attendance_date, status, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           notes = VALUES(notes),
           recorded_by = VALUES(recorded_by),
           updated_at = CURRENT_TIMESTAMP`,
        [studentNo, subject, attendanceDate, status, notes, req.user.id || null]
      );
      savedCount += 1;
    }

    await conn.commit();
    res.status(201).json({
      message: 'Attendance saved to database',
      savedCount,
      subject,
      attendanceDate,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
