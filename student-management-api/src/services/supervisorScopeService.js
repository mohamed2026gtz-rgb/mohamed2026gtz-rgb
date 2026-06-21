const { pool } = require('../config/db');
const { getCenterContext } = require('./examCenterScope');

function assignmentDto(level, row) {
  const supCol = level === 'secondary' ? 'secondary_supervisor_id' : 'primary_supervisor_id';
  const centerCol = level === 'secondary' ? 'exam_center_id' : 'primary_exam_center_id';
  const assignmentId = Number(row.id);
  return {
    id: assignmentId,
    level,
    assignmentId,
    supervisorId: Number(row[supCol]),
    centerId: Number(row[centerCol]),
    academicYear: row.academic_year,
    assignedAt: row.assigned_at,
    centerName: row.center_name,
    region: row.region || null,
    district: row.district || null,
    schoolLevel: row.school_level || (level === 'primary' ? 'Primary' : 'Secondary'),
    schoolCount: row.school_count != null ? Number(row.school_count) : null,
    studentCount: row.student_count != null ? Number(row.student_count) : null,
  };
}

async function findSupervisorRecord(userId, email) {
  const uid = Number(userId);
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (uid) {
    const [primaryByUser] = await pool.query(
      `SELECT id FROM primary_supervisors
       WHERE deleted_at IS NULL AND user_id = ?
       ORDER BY id DESC LIMIT 1`,
      [uid]
    );
    if (primaryByUser.length) return { level: 'primary', supervisorId: Number(primaryByUser[0].id) };

    const [secondaryByUser] = await pool.query(
      `SELECT id FROM secondary_supervisors
       WHERE deleted_at IS NULL AND user_id = ?
       ORDER BY id DESC LIMIT 1`,
      [uid]
    );
    if (secondaryByUser.length) return { level: 'secondary', supervisorId: Number(secondaryByUser[0].id) };
  }

  if (normalizedEmail) {
    const [primaryByEmail] = await pool.query(
      `SELECT id FROM primary_supervisors
       WHERE deleted_at IS NULL AND LOWER(email) = ?
       ORDER BY id DESC LIMIT 1`,
      [normalizedEmail]
    );
    if (primaryByEmail.length) return { level: 'primary', supervisorId: Number(primaryByEmail[0].id) };

    const [secondaryByEmail] = await pool.query(
      `SELECT id FROM secondary_supervisors
       WHERE deleted_at IS NULL AND LOWER(email) = ?
       ORDER BY id DESC LIMIT 1`,
      [normalizedEmail]
    );
    if (secondaryByEmail.length) return { level: 'secondary', supervisorId: Number(secondaryByEmail[0].id) };
  }

  return null;
}

async function findAssignmentBySupervisorId(level, supervisorId) {
  const sid = Number(supervisorId);
  if (!sid) return null;

  if (level === 'primary') {
    const [rows] = await pool.query(
      `SELECT a.*, pec.center_name, pec.region, pec.district, pec.school_count,
        (SELECT COUNT(*)
         FROM students_management st
         INNER JOIN schools_management sch ON st.school_id = sch.school_id
         WHERE st.deleted_at IS NULL AND sch.school_level = 'Primary'
           AND TRIM(sch.exam_center_name) = TRIM(pec.center_name)
           AND (pec.region IS NULL OR sch.region = pec.region)
           AND (pec.district IS NULL OR sch.district = pec.district)) AS student_count
       FROM primary_supervisor_center_assignments a
       INNER JOIN primary_exam_centers pec ON a.primary_exam_center_id = pec.id
       WHERE a.primary_supervisor_id = ? AND a.deleted_at IS NULL
       ORDER BY a.assigned_at DESC LIMIT 1`,
      [sid]
    );
    return rows.length ? assignmentDto('primary', rows[0]) : null;
  }

  const [rows] = await pool.query(
    `SELECT a.*, ec.center_name, sch.region, sch.school_level,
      (SELECT COUNT(DISTINCT ec2.school_id)
       FROM exam_centers ec2
       INNER JOIN schools_management sch2 ON ec2.school_id = sch2.school_id
       WHERE ec2.deleted_at IS NULL
         AND TRIM(ec2.center_name) = TRIM(ec.center_name)
         AND sch2.region = sch.region
         AND sch2.school_level IN ('Secondary', 'Technical TVET')) AS school_count,
      (SELECT COUNT(*)
       FROM students_management st
       INNER JOIN exam_centers ec2 ON st.school_id = ec2.school_id
       INNER JOIN schools_management sch2 ON ec2.school_id = sch2.school_id
       WHERE st.deleted_at IS NULL AND ec2.deleted_at IS NULL
         AND TRIM(ec2.center_name) = TRIM(ec.center_name)
         AND sch2.region = sch.region
         AND sch2.school_level IN ('Secondary', 'Technical TVET')) AS student_count
     FROM secondary_supervisor_center_assignments a
     INNER JOIN exam_centers ec ON a.exam_center_id = ec.id
     LEFT JOIN schools_management sch ON ec.school_id = sch.school_id
     WHERE a.secondary_supervisor_id = ? AND a.deleted_at IS NULL
     ORDER BY a.assigned_at DESC LIMIT 1`,
    [sid]
  );
  return rows.length ? assignmentDto('secondary', rows[0]) : null;
}

async function findSupervisorAssignmentForUser(user) {
  if (!user?.id && !user?.email) return null;

  const supervisor = await findSupervisorRecord(user.id, user.email);
  if (supervisor) {
    const bySupervisor = await findAssignmentBySupervisorId(supervisor.level, supervisor.supervisorId);
    if (bySupervisor) return bySupervisor;
  }

  const byUser = await findAssignmentByUserId(user.id);
  if (byUser) return byUser;
  return findAssignmentByEmail(user.email);
}

async function findAssignmentByUserId(userId) {
  const uid = Number(userId);
  if (!uid) return null;

  const [primary] = await pool.query(
    `SELECT a.*, pec.center_name, pec.region, pec.district, pec.school_count,
      (SELECT COUNT(*)
       FROM students_management st
       INNER JOIN schools_management sch ON st.school_id = sch.school_id
       WHERE st.deleted_at IS NULL AND sch.school_level = 'Primary'
         AND TRIM(sch.exam_center_name) = TRIM(pec.center_name)
         AND (pec.region IS NULL OR sch.region = pec.region)
         AND (pec.district IS NULL OR sch.district = pec.district)) AS student_count
     FROM primary_supervisor_center_assignments a
     INNER JOIN primary_supervisors s ON a.primary_supervisor_id = s.id
     INNER JOIN primary_exam_centers pec ON a.primary_exam_center_id = pec.id
     WHERE s.user_id = ? AND a.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY a.assigned_at DESC LIMIT 1`,
    [uid]
  );
  if (primary.length) return assignmentDto('primary', primary[0]);

  const [secondary] = await pool.query(
    `SELECT a.*, ec.center_name, sch.region, sch.school_level,
      (SELECT COUNT(DISTINCT ec2.school_id)
       FROM exam_centers ec2
       INNER JOIN schools_management sch2 ON ec2.school_id = sch2.school_id
       WHERE ec2.deleted_at IS NULL
         AND TRIM(ec2.center_name) = TRIM(ec.center_name)
         AND sch2.region = sch.region
         AND sch2.school_level IN ('Secondary', 'Technical TVET')) AS school_count,
      (SELECT COUNT(*)
       FROM students_management st
       INNER JOIN exam_centers ec2 ON st.school_id = ec2.school_id
       INNER JOIN schools_management sch2 ON ec2.school_id = sch2.school_id
       WHERE st.deleted_at IS NULL AND ec2.deleted_at IS NULL
         AND TRIM(ec2.center_name) = TRIM(ec.center_name)
         AND sch2.region = sch.region
         AND sch2.school_level IN ('Secondary', 'Technical TVET')) AS student_count
     FROM secondary_supervisor_center_assignments a
     INNER JOIN secondary_supervisors s ON a.secondary_supervisor_id = s.id
     INNER JOIN exam_centers ec ON a.exam_center_id = ec.id
     LEFT JOIN schools_management sch ON ec.school_id = sch.school_id
     WHERE s.user_id = ? AND a.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY a.assigned_at DESC LIMIT 1`,
    [uid]
  );
  if (secondary.length) return assignmentDto('secondary', secondary[0]);

  return null;
}

async function findAssignmentByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  const [primary] = await pool.query(
    `SELECT a.*, pec.center_name, pec.region, pec.district, pec.school_count,
      (SELECT COUNT(*)
       FROM students_management st
       INNER JOIN schools_management sch ON st.school_id = sch.school_id
       WHERE st.deleted_at IS NULL AND sch.school_level = 'Primary'
         AND TRIM(sch.exam_center_name) = TRIM(pec.center_name)
         AND (pec.region IS NULL OR sch.region = pec.region)
         AND (pec.district IS NULL OR sch.district = pec.district)) AS student_count
     FROM primary_supervisor_center_assignments a
     INNER JOIN primary_supervisors s ON a.primary_supervisor_id = s.id
     INNER JOIN primary_exam_centers pec ON a.primary_exam_center_id = pec.id
     WHERE LOWER(s.email) = ? AND a.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY a.assigned_at DESC LIMIT 1`,
    [normalized]
  );
  if (primary.length) return assignmentDto('primary', primary[0]);

  const [secondary] = await pool.query(
    `SELECT a.*, ec.center_name, sch.region, sch.school_level,
      (SELECT COUNT(DISTINCT ec2.school_id)
       FROM exam_centers ec2
       INNER JOIN schools_management sch2 ON ec2.school_id = sch2.school_id
       WHERE ec2.deleted_at IS NULL
         AND TRIM(ec2.center_name) = TRIM(ec.center_name)
         AND sch2.region = sch.region
         AND sch2.school_level IN ('Secondary', 'Technical TVET')) AS school_count,
      (SELECT COUNT(*)
       FROM students_management st
       INNER JOIN exam_centers ec2 ON st.school_id = ec2.school_id
       INNER JOIN schools_management sch2 ON ec2.school_id = sch2.school_id
       WHERE st.deleted_at IS NULL AND ec2.deleted_at IS NULL
         AND TRIM(ec2.center_name) = TRIM(ec.center_name)
         AND sch2.region = sch.region
         AND sch2.school_level IN ('Secondary', 'Technical TVET')) AS student_count
     FROM secondary_supervisor_center_assignments a
     INNER JOIN secondary_supervisors s ON a.secondary_supervisor_id = s.id
     INNER JOIN exam_centers ec ON a.exam_center_id = ec.id
     LEFT JOIN schools_management sch ON ec.school_id = sch.school_id
     WHERE LOWER(s.email) = ? AND a.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY a.assigned_at DESC LIMIT 1`,
    [normalized]
  );
  if (secondary.length) return assignmentDto('secondary', secondary[0]);

  return null;
}

async function getSupervisorAssignment(user) {
  return findSupervisorAssignmentForUser(user);
}

async function assertCenterAccess(user, level, centerId) {
  const assignment = await getSupervisorAssignment(user);
  if (!assignment) {
    return { ok: false, status: 403, message: 'No exam center assignment found for this supervisor' };
  }
  if (assignment.level !== level || assignment.centerId !== Number(centerId)) {
    return {
      ok: false,
      status: 403,
      message: 'You can only access your assigned exam center',
    };
  }
  return { ok: true, assignment };
}

async function studentsBelongToCenter(level, centerId, studentNos) {
  const ids = [...new Set(studentNos.map((s) => String(s).trim()).filter(Boolean))];
  if (!ids.length) return { ok: true, invalid: [] };

  const ctx = await getCenterContext(level, centerId);
  if (!ctx) return { ok: false, invalid: ids };

  let fromSql;
  let params;

  if (ctx.level === 'primary') {
    fromSql = `FROM students_management st
      INNER JOIN schools_management sch ON st.school_id = sch.school_id
      WHERE st.deleted_at IS NULL
        AND sch.school_level = 'Primary'
        AND TRIM(sch.exam_center_name) = TRIM(?)
        AND st.unique_id IN (${ids.map(() => '?').join(', ')})`;
    params = [ctx.centerName, ...ids];
    if (ctx.region) {
      fromSql += ' AND sch.region = ?';
      params.push(ctx.region);
    }
    if (ctx.district) {
      fromSql += ' AND sch.district = ?';
      params.push(ctx.district);
    }
  } else {
    fromSql = `FROM students_management st
      INNER JOIN schools_management sch ON st.school_id = sch.school_id
      INNER JOIN exam_centers ec ON ec.school_id = sch.school_id
      WHERE st.deleted_at IS NULL AND ec.deleted_at IS NULL
        AND TRIM(ec.center_name) = TRIM(?)
        AND sch.region = ?
        AND sch.school_level IN ('Secondary', 'Technical TVET')
        AND st.unique_id IN (${ids.map(() => '?').join(', ')})`;
    params = [ctx.centerName, ctx.region, ...ids];
  }

  const [rows] = await pool.query(`SELECT DISTINCT st.unique_id AS studentNo ${fromSql}`, params);
  const allowed = new Set(rows.map((r) => r.studentNo));
  const invalid = ids.filter((id) => !allowed.has(id));
  return { ok: invalid.length === 0, invalid };
}

module.exports = {
  getSupervisorAssignment,
  findSupervisorAssignmentForUser,
  assertCenterAccess,
  studentsBelongToCenter,
  findAssignmentByUserId,
};
