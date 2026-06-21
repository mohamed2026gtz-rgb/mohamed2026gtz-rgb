const express = require('express');
const { pool } = require('../config/db');
const { authenticate, requireAdministration } = require('../middleware/auth');

const router = express.Router();

const EXAM_LEVELS = ['Primary', 'ABE', 'Secondary', 'Technical TVET'];
const SHIFT_LABELS = { 1: 'First exam', 2: 'Second exam' };

function toSubjectDto(row) {
  return {
    id: Number(row.id),
    schoolLevel: row.school_level,
    subjectName: row.subject_name,
    subjectCode: row.subject_code || null,
    paperLabel: row.paper_label || null,
    academicYear: row.academic_year,
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
  };
}

function toTimetableDto(row) {
  const shift = Number(row.exam_shift);
  return {
    id: Number(row.id),
    academicYear: row.academic_year,
    schoolLevel: row.school_level,
    examDate: row.exam_date instanceof Date
      ? row.exam_date.toISOString().slice(0, 10)
      : String(row.exam_date).slice(0, 10),
    examShift: shift,
    examShiftLabel: SHIFT_LABELS[shift] || `Shift ${shift}`,
    subjectId: Number(row.subject_id),
    subjectName: row.subject_name,
    subjectCode: row.subject_code || null,
    paperLabel: row.paper_label || null,
    notes: row.notes || null,
    displayLabel: row.display_label || row.subject_name,
  };
}

function attendanceSubjectLabel(row) {
  const parts = [row.subject_name];
  if (row.paper_label) parts.push(row.paper_label);
  const shift = Number(row.exam_shift);
  if (shift === 2) parts.push('(2nd exam)');
  return parts.join(' · ');
}

router.get('/levels', authenticate, (req, res) => {
  res.json(
    EXAM_LEVELS.map((level) => ({
      level,
      expectedSubjects:
        level === 'Primary' || level === 'ABE' ? 7 : level === 'Secondary' ? 12 : null,
    }))
  );
});

router.get('/subjects', authenticate, async (req, res, next) => {
  try {
    const level = String(req.query.level || '').trim();
    const academicYear = String(req.query.academicYear || '2025/2026').trim();
    let sql = `SELECT * FROM exam_subjects
      WHERE academic_year = ? AND is_active = 1`;
    const params = [academicYear];

    if (level) {
      sql += ' AND school_level = ?';
      params.push(level);
    }

    sql += ' ORDER BY school_level, sort_order, subject_name';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toSubjectDto));
  } catch (err) {
    next(err);
  }
});

router.post('/subjects', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const schoolLevel = String(req.body.schoolLevel || '').trim();
    const subjectName = String(req.body.subjectName || '').trim();
    const academicYear = String(req.body.academicYear || '2025/2026').trim();
    const subjectCode = req.body.subjectCode ? String(req.body.subjectCode).trim() : null;
    const paperLabel = req.body.paperLabel ? String(req.body.paperLabel).trim() : null;
    const sortOrder = Number(req.body.sortOrder || 0);

    if (!schoolLevel || !subjectName) {
      return res.status(400).json({ message: 'schoolLevel and subjectName are required' });
    }
    if (!EXAM_LEVELS.includes(schoolLevel)) {
      return res.status(400).json({ message: `schoolLevel must be one of: ${EXAM_LEVELS.join(', ')}` });
    }

    const [result] = await pool.query(
      `INSERT INTO exam_subjects
       (school_level, subject_name, subject_code, paper_label, academic_year, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [schoolLevel, subjectName, subjectCode, paperLabel, academicYear, sortOrder]
    );

    const [rows] = await pool.query('SELECT * FROM exam_subjects WHERE id = ?', [result.insertId]);
    res.status(201).json(toSubjectDto(rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Subject already exists for this level and year' });
    }
    next(err);
  }
});

router.put('/subjects/:id', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const subjectName = req.body.subjectName != null ? String(req.body.subjectName).trim() : null;
    const subjectCode = req.body.subjectCode != null ? String(req.body.subjectCode).trim() : null;
    const paperLabel = req.body.paperLabel != null ? String(req.body.paperLabel).trim() : null;
    const sortOrder = req.body.sortOrder != null ? Number(req.body.sortOrder) : null;
    const isActive = req.body.isActive != null ? (req.body.isActive ? 1 : 0) : null;

    const updates = [];
    const params = [];
    if (subjectName) {
      updates.push('subject_name = ?');
      params.push(subjectName);
    }
    if (subjectCode !== null) {
      updates.push('subject_code = ?');
      params.push(subjectCode || null);
    }
    if (paperLabel !== null) {
      updates.push('paper_label = ?');
      params.push(paperLabel || null);
    }
    if (sortOrder != null && !Number.isNaN(sortOrder)) {
      updates.push('sort_order = ?');
      params.push(sortOrder);
    }
    if (isActive != null) {
      updates.push('is_active = ?');
      params.push(isActive);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE exam_subjects SET ${updates.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query('SELECT * FROM exam_subjects WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Subject not found' });
    res.json(toSubjectDto(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/subjects/:id', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[used]] = await pool.query(
      'SELECT COUNT(*) AS c FROM exam_timetable WHERE subject_id = ?',
      [id]
    );
    if (used.c > 0) {
      await pool.query('UPDATE exam_subjects SET is_active = 0 WHERE id = ?', [id]);
      return res.json({ message: 'Subject deactivated (used in timetable)' });
    }
    await pool.query('DELETE FROM exam_subjects WHERE id = ?', [id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    next(err);
  }
});

router.get('/timetable', authenticate, async (req, res, next) => {
  try {
    const level = String(req.query.level || '').trim();
    const academicYear = String(req.query.academicYear || '2025/2026').trim();
    const fromDate = req.query.fromDate ? String(req.query.fromDate).slice(0, 10) : null;
    const toDate = req.query.toDate ? String(req.query.toDate).slice(0, 10) : null;

    let sql = `SELECT t.*, s.subject_name, s.subject_code, s.paper_label,
      CONCAT(s.subject_name, IF(t.exam_shift = 2, ' (2nd exam)', '')) AS display_label
      FROM exam_timetable t
      JOIN exam_subjects s ON s.id = t.subject_id
      WHERE t.academic_year = ?`;
    const params = [academicYear];

    if (level) {
      sql += ' AND t.school_level = ?';
      params.push(level);
    }
    if (fromDate) {
      sql += ' AND t.exam_date >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      sql += ' AND t.exam_date <= ?';
      params.push(toDate);
    }

    sql += ' ORDER BY t.exam_date, t.exam_shift, t.school_level';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toTimetableDto));
  } catch (err) {
    next(err);
  }
});

router.get('/timetable/for-attendance', authenticate, async (req, res, next) => {
  try {
    const level = String(req.query.level || '').trim();
    const examDate = String(req.query.examDate || '').slice(0, 10);
    const academicYear = String(req.query.academicYear || '2025/2026').trim();

    if (!level || !examDate) {
      return res.status(400).json({ message: 'level and examDate are required' });
    }

    const [rows] = await pool.query(
      `SELECT t.*, s.subject_name, s.subject_code, s.paper_label
       FROM exam_timetable t
       JOIN exam_subjects s ON s.id = t.subject_id
       WHERE t.school_level = ? AND t.academic_year = ? AND t.exam_date = ?
       ORDER BY t.exam_shift`,
      [level, academicYear, examDate]
    );

    res.json(
      rows.map((row) => {
        const dto = toTimetableDto(row);
        return {
          ...dto,
          attendanceSubject: attendanceSubjectLabel(row),
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/timetable', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const schoolLevel = String(req.body.schoolLevel || '').trim();
    const academicYear = String(req.body.academicYear || '2025/2026').trim();
    const examDate = String(req.body.examDate || '').slice(0, 10);
    const examShift = Number(req.body.examShift || 1);
    const subjectId = Number(req.body.subjectId);
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    if (!schoolLevel || !examDate || !subjectId) {
      return res.status(400).json({
        message: 'schoolLevel, examDate, and subjectId are required',
      });
    }
    if (![1, 2].includes(examShift)) {
      return res.status(400).json({ message: 'examShift must be 1 (first) or 2 (second)' });
    }

    const [subjectRows] = await pool.query(
      'SELECT id FROM exam_subjects WHERE id = ? AND school_level = ? AND academic_year = ? AND is_active = 1',
      [subjectId, schoolLevel, academicYear]
    );
    if (!subjectRows.length) {
      return res.status(400).json({ message: 'Subject not found for this level and year' });
    }

    const [result] = await pool.query(
      `INSERT INTO exam_timetable
       (academic_year, school_level, exam_date, exam_shift, subject_id, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [academicYear, schoolLevel, examDate, examShift, subjectId, notes]
    );

    const [rows] = await pool.query(
      `SELECT t.*, s.subject_name, s.subject_code, s.paper_label,
        CONCAT(s.subject_name, IF(t.exam_shift = 2, ' (2nd exam)', '')) AS display_label
       FROM exam_timetable t
       JOIN exam_subjects s ON s.id = t.subject_id
       WHERE t.id = ?`,
      [result.insertId]
    );
    res.status(201).json(toTimetableDto(rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'This exam day already has that shift scheduled for this level',
      });
    }
    next(err);
  }
});

router.put('/timetable/:id', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const examDate = req.body.examDate ? String(req.body.examDate).slice(0, 10) : null;
    const examShift = req.body.examShift != null ? Number(req.body.examShift) : null;
    const subjectId = req.body.subjectId != null ? Number(req.body.subjectId) : null;
    const notes = req.body.notes != null ? String(req.body.notes).trim() : null;

    const updates = [];
    const params = [];
    if (examDate) {
      updates.push('exam_date = ?');
      params.push(examDate);
    }
    if (examShift != null) {
      if (![1, 2].includes(examShift)) {
        return res.status(400).json({ message: 'examShift must be 1 or 2' });
      }
      updates.push('exam_shift = ?');
      params.push(examShift);
    }
    if (subjectId) {
      updates.push('subject_id = ?');
      params.push(subjectId);
    }
    if (notes !== null) {
      updates.push('notes = ?');
      params.push(notes || null);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE exam_timetable SET ${updates.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query(
      `SELECT t.*, s.subject_name, s.subject_code, s.paper_label,
        CONCAT(s.subject_name, IF(t.exam_shift = 2, ' (2nd exam)', '')) AS display_label
       FROM exam_timetable t
       JOIN exam_subjects s ON s.id = t.subject_id
       WHERE t.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Timetable entry not found' });
    res.json(toTimetableDto(rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That exam day shift is already scheduled' });
    }
    next(err);
  }
});

router.delete('/timetable/:id', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [result] = await pool.query('DELETE FROM exam_timetable WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Timetable entry not found' });
    }
    res.json({ message: 'Timetable entry deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
