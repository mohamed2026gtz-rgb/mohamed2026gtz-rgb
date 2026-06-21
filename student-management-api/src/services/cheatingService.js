const { pool } = require('../config/db');
const { findCenterStudent } = require('./examCenterScope');
const { getSupervisorAssignment } = require('./supervisorScopeService');
const { isExamSupervisor, isAdministration } = require('../utils/auth');

function formatDate(row) {
  if (!row) return null;
  if (row instanceof Date) return row.toISOString().slice(0, 10);
  return String(row).slice(0, 10);
}

function toIncidentDto(row) {
  return {
    id: Number(row.id),
    studentNo: row.student_unique_id,
    studentName: row.student_name || null,
    schoolId: row.school_id ? Number(row.school_id) : null,
    schoolName: row.school_name || null,
    region: row.region || null,
    schoolLevel: row.school_level || null,
    examCenterName: row.exam_center_name || null,
    academicYear: row.academic_year,
    examDate: formatDate(row.exam_date),
    subject: row.subject,
    examShift: row.exam_shift != null ? Number(row.exam_shift) : null,
    cheatingTypeId: row.cheating_type_id ? Number(row.cheating_type_id) : null,
    cheatingTypeCode: row.type_code || null,
    cheatingTypeLabel: row.type_label || row.custom_type_label || null,
    customTypeLabel: row.custom_type_label || null,
    incidentDescription: row.incident_description,
    evidenceNotes: row.evidence_notes || null,
    invigilatorName: row.invigilator_name || null,
    invigilatorAction: row.invigilator_action || null,
    supervisorName: row.supervisor_name || null,
    supervisorAction: row.supervisor_action || null,
    actionTaken: row.action_taken || null,
    severity: row.severity,
    status: row.status,
    followUpNotes: row.follow_up_notes || null,
    recordedBy: row.recorded_by || null,
    recordedByName: row.recorded_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function resolveStudentContext(studentNo, user) {
  const term = String(studentNo || '').trim();
  if (!term) return null;

  if (isExamSupervisor(user) && !isAdministration(user)) {
    const assignment = await getSupervisorAssignment(user);
    if (!assignment) return null;
    const found = await findCenterStudent(assignment.level, assignment.centerId, term);
    if (!found) return null;
    const row = found.row;
    return {
      studentNo: row.unique_id,
      studentName: row.student_name,
      schoolId: row.school_id ? Number(row.school_id) : null,
      schoolName: row.joined_school_name || row.school_name || null,
      region: row.joined_region || row.region || null,
      schoolLevel: row.joined_school_level || null,
      examCenterName: assignment.centerName,
    };
  }

  const [rows] = await pool.query(
    `SELECT st.unique_id, st.student_name, st.school_id, sch.school_name, sch.region,
            sch.school_level, sch.exam_center_name
     FROM students_management st
     INNER JOIN schools_management sch ON st.school_id = sch.school_id
     WHERE st.deleted_at IS NULL
       AND (st.unique_id = ? OR st.student_no = ?)
     LIMIT 1`,
    [term, term]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    studentNo: row.unique_id,
    studentName: row.student_name,
    schoolId: row.school_id ? Number(row.school_id) : null,
    schoolName: row.school_name || null,
    region: row.region || null,
    schoolLevel: row.school_level || null,
    examCenterName: row.exam_center_name || null,
  };
}

async function assertSupervisorCanAccessIncident(user, incidentId) {
  if (isAdministration(user)) return { ok: true };
  if (!isExamSupervisor(user)) {
    return { ok: false, status: 403, message: 'Access denied' };
  }
  const assignment = await getSupervisorAssignment(user);
  if (!assignment) {
    return { ok: false, status: 403, message: 'No exam center assignment' };
  }

  const [rows] = await pool.query(
    `SELECT id FROM exam_cheating_incidents
     WHERE id = ? AND deleted_at IS NULL
       AND exam_center_name = ?
       AND (region IS NULL OR region = ? OR ? IS NULL)
     LIMIT 1`,
    [incidentId, assignment.centerName, assignment.region, assignment.region]
  );
  if (!rows.length) {
    return { ok: false, status: 403, message: 'Incident not in your exam center scope' };
  }
  return { ok: true, assignment };
}

module.exports = {
  toIncidentDto,
  resolveStudentContext,
  assertSupervisorCanAccessIncident,
  formatDate,
};
