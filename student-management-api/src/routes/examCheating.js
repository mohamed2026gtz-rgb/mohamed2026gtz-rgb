const express = require('express');
const { pool } = require('../config/db');
const { authenticate, requireAdministration } = require('../middleware/auth');
const { isExamSupervisor, isAdministration } = require('../utils/auth');
const {
  toIncidentDto,
  resolveStudentContext,
  assertSupervisorCanAccessIncident,
} = require('../services/cheatingService');
const { getSupervisorAssignment } = require('../services/supervisorScopeService');

const router = express.Router();

const SEVERITIES = new Set(['Minor', 'Moderate', 'Serious', 'Severe']);
const STATUSES = new Set(['Reported', 'Under investigation', 'Action taken', 'Closed']);

router.get('/types', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM exam_cheating_types
       WHERE is_active = 1
       ORDER BY sort_order, label`
    );
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        code: r.code,
        label: r.label,
        description: r.description || null,
        sortOrder: Number(r.sort_order),
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post('/types', authenticate, requireAdministration, async (req, res, next) => {
  try {
    const code = String(req.body.code || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    const label = String(req.body.label || '').trim();
    const description = req.body.description?.trim() || null;
    if (!code || !label) {
      return res.status(400).json({ message: 'code and label are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO exam_cheating_types (code, label, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [code, label, description, Number(req.body.sortOrder || 50)]
    );
    const [rows] = await pool.query('SELECT * FROM exam_cheating_types WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json({
      id: Number(rows[0].id),
      code: rows[0].code,
      label: rows[0].label,
      description: rows[0].description,
      sortOrder: Number(rows[0].sort_order),
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cheating type code already exists' });
    }
    next(err);
  }
});

router.get('/incidents', authenticate, async (req, res, next) => {
  try {
    const { search, region, schoolLevel, examDate, subject, status, page = 1, pageSize = 50 } =
      req.query;
    let sql = `SELECT i.*, t.code AS type_code, t.label AS type_label
      FROM exam_cheating_incidents i
      LEFT JOIN exam_cheating_types t ON t.id = i.cheating_type_id
      WHERE i.deleted_at IS NULL`;
    const params = [];

    if (isExamSupervisor(req.user) && !isAdministration(req.user)) {
      const assignment = await getSupervisorAssignment(req.user);
      if (!assignment) {
        return res.json({ items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 });
      }
      sql += ' AND i.exam_center_name = ?';
      params.push(assignment.centerName);
      if (assignment.region) {
        sql += ' AND (i.region = ? OR i.region IS NULL)';
        params.push(assignment.region);
      }
    }

    if (search?.trim()) {
      sql += ' AND (i.student_unique_id LIKE ? OR i.student_name LIKE ? OR i.subject LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (region?.trim()) {
      sql += ' AND i.region = ?';
      params.push(region.trim());
    }
    if (schoolLevel?.trim()) {
      sql += ' AND i.school_level = ?';
      params.push(schoolLevel.trim());
    }
    if (examDate?.trim()) {
      sql += ' AND i.exam_date = ?';
      params.push(examDate.trim().slice(0, 10));
    }
    if (subject?.trim()) {
      sql += ' AND i.subject = ?';
      params.push(subject.trim());
    }
    if (status?.trim()) {
      sql += ' AND i.status = ?';
      params.push(status.trim());
    }

    const countSql = sql.replace(
      'SELECT i.*, t.code AS type_code, t.label AS type_label',
      'SELECT COUNT(*) AS c'
    );
    const [[{ c: totalCount }]] = await pool.query(countSql, params);

    const limit = Math.min(Math.max(Number(pageSize) || 50, 1), 200);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offset = (pageNum - 1) * limit;

    sql += ' ORDER BY i.exam_date DESC, i.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({
      items: rows.map(toIncidentDto),
      totalCount: Number(totalCount),
      page: pageNum,
      pageSize: limit,
      totalPages: Math.ceil(Number(totalCount) / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/incidents/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const scope = await assertSupervisorCanAccessIncident(req.user, id);
    if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

    const [rows] = await pool.query(
      `SELECT i.*, t.code AS type_code, t.label AS type_label
       FROM exam_cheating_incidents i
       LEFT JOIN exam_cheating_types t ON t.id = i.cheating_type_id
       WHERE i.id = ? AND i.deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Incident not found' });
    res.json(toIncidentDto(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.post('/incidents', authenticate, async (req, res, next) => {
  try {
    const studentNo = String(req.body.studentNo || '').trim();
    const examDate = String(req.body.examDate || '').slice(0, 10);
    const subject = String(req.body.subject || '').trim();
    const incidentDescription = String(req.body.incidentDescription || '').trim();

    if (!studentNo || !examDate || !subject || !incidentDescription) {
      return res.status(400).json({
        message: 'studentNo, examDate, subject, and incidentDescription are required',
      });
    }

    const studentCtx = await resolveStudentContext(studentNo, req.user);
    if (!studentCtx) {
      return res.status(404).json({ message: 'Student not found or not in your exam center scope' });
    }

    const severity = SEVERITIES.has(req.body.severity) ? req.body.severity : 'Moderate';
    const status = STATUSES.has(req.body.status) ? req.body.status : 'Reported';
    const examShift = req.body.examShift != null ? Number(req.body.examShift) : null;
    const cheatingTypeId = req.body.cheatingTypeId ? Number(req.body.cheatingTypeId) : null;

    let supervisorName = req.body.supervisorName?.trim() || null;
    if (isExamSupervisor(req.user) && !isAdministration(req.user)) {
      const assignment = await getSupervisorAssignment(req.user);
      supervisorName = supervisorName || req.user.fullName || req.user.email || null;
      if (assignment && !studentCtx.examCenterName) {
        studentCtx.examCenterName = assignment.centerName;
      }
    }

    const payload = {
      student_unique_id: studentCtx.studentNo,
      student_name: studentCtx.studentName,
      school_id: studentCtx.schoolId,
      school_name: studentCtx.schoolName,
      region: studentCtx.region,
      school_level: studentCtx.schoolLevel,
      exam_center_name: studentCtx.examCenterName,
      academic_year: String(req.body.academicYear || '2025/2026').trim(),
      exam_date: examDate,
      subject,
      exam_shift: examShift,
      cheating_type_id: cheatingTypeId,
      custom_type_label: req.body.customTypeLabel?.trim() || null,
      incident_description: incidentDescription,
      evidence_notes: req.body.evidenceNotes?.trim() || null,
      invigilator_name: req.body.invigilatorName?.trim() || null,
      invigilator_action: req.body.invigilatorAction?.trim() || null,
      supervisor_name: supervisorName,
      supervisor_action: req.body.supervisorAction?.trim() || null,
      action_taken: req.body.actionTaken?.trim() || null,
      severity,
      status,
      follow_up_notes: req.body.followUpNotes?.trim() || null,
      recorded_by: req.user.id || null,
      recorded_by_name: req.user.fullName || req.user.email || null,
    };

    const [result] = await pool.query('INSERT INTO exam_cheating_incidents SET ?', [payload]);
    const [rows] = await pool.query(
      `SELECT i.*, t.code AS type_code, t.label AS type_label
       FROM exam_cheating_incidents i
       LEFT JOIN exam_cheating_types t ON t.id = i.cheating_type_id
       WHERE i.id = ?`,
      [result.insertId]
    );
    res.status(201).json(toIncidentDto(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.put('/incidents/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const scope = await assertSupervisorCanAccessIncident(req.user, id);
    if (!scope.ok) return res.status(scope.status).json({ message: scope.message });

    const updates = {};
    const map = {
      examDate: 'exam_date',
      subject: 'subject',
      examShift: 'exam_shift',
      cheatingTypeId: 'cheating_type_id',
      customTypeLabel: 'custom_type_label',
      incidentDescription: 'incident_description',
      evidenceNotes: 'evidence_notes',
      invigilatorName: 'invigilator_name',
      invigilatorAction: 'invigilator_action',
      supervisorName: 'supervisor_name',
      supervisorAction: 'supervisor_action',
      actionTaken: 'action_taken',
      severity: 'severity',
      status: 'status',
      followUpNotes: 'follow_up_notes',
    };

    for (const [key, col] of Object.entries(map)) {
      if (req.body[key] !== undefined) {
        updates[col] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    }

    if (updates.severity && !SEVERITIES.has(updates.severity)) {
      return res.status(400).json({ message: 'Invalid severity' });
    }
    if (updates.status && !STATUSES.has(updates.status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (updates.exam_date) updates.exam_date = String(updates.exam_date).slice(0, 10);

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    await pool.query('UPDATE exam_cheating_incidents SET ? WHERE id = ? AND deleted_at IS NULL', [
      updates,
      id,
    ]);

    const [rows] = await pool.query(
      `SELECT i.*, t.code AS type_code, t.label AS type_label
       FROM exam_cheating_incidents i
       LEFT JOIN exam_cheating_types t ON t.id = i.cheating_type_id
       WHERE i.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Incident not found' });
    res.json(toIncidentDto(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/incidents/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!isAdministration(req.user)) {
      return res.status(403).json({ message: 'Administration access required to delete incidents' });
    }
    const [result] = await pool.query(
      'UPDATE exam_cheating_incidents SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Incident not found' });
    res.json({ message: 'Incident removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
