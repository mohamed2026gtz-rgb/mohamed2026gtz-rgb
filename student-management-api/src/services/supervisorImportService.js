const { pool } = require('../config/db');
const { parseCsv } = require('../utils/csvParse');
const { supervisorInsertFields } = require('../utils/supervisorMappers');
const {
  createSupervisorUser,
  linkSupervisorUser,
  findUserByEmail,
} = require('./supervisorUserService');
const { saveSupervisorPhoto } = require('../utils/supervisorPhoto');
const { findPhotoForSupervisorRow } = require('../utils/supervisorPhotoImport');

function tableForLevel(level) {
  return level === 'secondary' ? 'secondary_supervisors' : 'primary_supervisors';
}

function assignmentTableForLevel(level) {
  return level === 'secondary'
    ? 'secondary_supervisor_center_assignments'
    : 'primary_supervisor_center_assignments';
}

function supervisorIdColumn(level) {
  return level === 'secondary' ? 'secondary_supervisor_id' : 'primary_supervisor_id';
}

function centerIdColumn(level) {
  return level === 'secondary' ? 'exam_center_id' : 'primary_exam_center_id';
}

function mapSupervisorRow(row) {
  return {
    name: row.name || row.full_name || row.supervisor_name || '',
    sex: row.sex || row.gender || '',
    mobile: row.mobile || row.phone || row.telephone || '',
    yearOfBirth: row.year_of_birth || row.yearofbirth || row.dob || row.date_of_birth || '',
    residency: row.residency || row.residence || '',
    region: row.region || '',
    email: row.email || row.email_address || '',
    currentInstitution: row.current_institution || row.institution || row.school || '',
    title: row.title || row.job_title || '',
    experienceForSupervision:
      row.experience_for_supervision || row.experience || row.supervision_experience || '',
    initialPassword: row.initial_password || row.password || row.temporary_password || '',
  };
}

function mapAssignmentRow(row) {
  return {
    supervisorEmail: row.supervisor_email || row.email || '',
    supervisorName: row.supervisor_name || row.name || '',
    centerName: row.center_name || row.exam_center || row.center || '',
    region: row.region || '',
    district: row.district || '',
    academicYear: row.academic_year || row.year || '2025/2026',
    notes: row.notes || row.note || '',
    initialPassword: row.initial_password || row.password || '',
  };
}

async function findSupervisorByIdentity(level, { email, name }) {
  const table = tableForLevel(level);
  if (email?.trim()) {
    const [rows] = await pool.query(
      `SELECT id, name, email, user_id FROM ${table}
       WHERE deleted_at IS NULL AND LOWER(TRIM(email)) = LOWER(TRIM(?))
       LIMIT 1`,
      [email.trim()]
    );
    if (rows.length) return rows[0];
  }
  if (name?.trim()) {
    const [rows] = await pool.query(
      `SELECT id, name, email, user_id FROM ${table}
       WHERE deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM(?))
       LIMIT 1`,
      [name.trim()]
    );
    if (rows.length) return rows[0];
  }
  return null;
}

async function findCenterByName(level, { centerName, region, district, academicYear }) {
  const name = centerName?.trim();
  if (!name) return null;

  if (level === 'secondary') {
    let sql = `
      SELECT ec.id, ec.center_name, sch.region, sch.district
      FROM exam_centers ec
      LEFT JOIN schools_management sch ON ec.school_id = sch.school_id
      WHERE ec.deleted_at IS NULL AND LOWER(TRIM(ec.center_name)) = LOWER(TRIM(?))`;
    const params = [name];
    if (region?.trim()) {
      sql += ' AND sch.region = ?';
      params.push(region.trim());
    }
    sql += ' ORDER BY ec.id LIMIT 1';
    const [rows] = await pool.query(sql, params);
    return rows.length ? { id: Number(rows[0].id), centerName: rows[0].center_name } : null;
  }

  let sql = `
    SELECT id, center_name, region, district
    FROM primary_exam_centers
    WHERE is_active = 1 AND LOWER(TRIM(center_name)) = LOWER(TRIM(?))`;
  const params = [name];
  if (region?.trim()) {
    sql += ' AND region = ?';
    params.push(region.trim());
  }
  if (district?.trim()) {
    sql += ' AND district = ?';
    params.push(district.trim());
  }
  if (academicYear?.trim()) {
    sql += ' AND academic_year = ?';
    params.push(academicYear.trim());
  }
  sql += ' ORDER BY id LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows.length ? { id: Number(rows[0].id), centerName: rows[0].center_name } : null;
}

async function findActiveAssignmentConflict(level, supervisorId, centerId, academicYear) {
  const assignTable = assignmentTableForLevel(level);
  const supCol = supervisorIdColumn(level);
  const centerCol = centerIdColumn(level);
  const supTable = tableForLevel(level);

  const centerNameJoin =
    level === 'secondary'
      ? `INNER JOIN exam_centers ec ON a.${centerCol} = ec.id`
      : `INNER JOIN primary_exam_centers ec ON a.${centerCol} = ec.id`;

  const [bySupervisor] = await pool.query(
    `SELECT a.${centerCol} AS assigned_center_id, ec.center_name
     FROM ${assignTable} a
     ${centerNameJoin}
     WHERE a.${supCol} = ? AND a.academic_year = ? AND a.deleted_at IS NULL
     LIMIT 1`,
    [supervisorId, academicYear]
  );
  if (bySupervisor.length && Number(bySupervisor[0].assigned_center_id) !== centerId) {
    return `Supervisor already assigned to "${bySupervisor[0].center_name}" for ${academicYear}`;
  }

  const [byCenter] = await pool.query(
    `SELECT a.${supCol} AS assigned_supervisor_id, s.name AS supervisor_name
     FROM ${assignTable} a
     INNER JOIN ${supTable} s ON a.${supCol} = s.id
     WHERE a.${centerCol} = ? AND a.academic_year = ? AND a.deleted_at IS NULL
     LIMIT 1`,
    [centerId, academicYear]
  );
  if (byCenter.length && Number(byCenter[0].assigned_supervisor_id) !== supervisorId) {
    return `Center already has supervisor "${byCenter[0].supervisor_name}" for ${academicYear}`;
  }

  return null;
}


async function attachSupervisorPhoto(level, supervisorId, photoEntry) {
  if (!photoEntry?.buffer?.length) return false;
  const table = tableForLevel(level);
  const imageUrl = await saveSupervisorPhoto(
    level,
    supervisorId,
    photoEntry.buffer,
    photoEntry.mimeType || 'image/jpeg'
  );
  await pool.query(`UPDATE ${table} SET image_url = ? WHERE id = ?`, [imageUrl, supervisorId]);
  return true;
}

async function findExistingSupervisor(level, mapped) {
  const table = tableForLevel(level);
  if (mapped.email?.trim()) {
    const [rows] = await pool.query(
      `SELECT id FROM ${table}
       WHERE deleted_at IS NULL AND LOWER(TRIM(email)) = LOWER(TRIM(?))
       LIMIT 1`,
      [mapped.email.trim()]
    );
    if (rows.length) return Number(rows[0].id);
  }
  if (mapped.mobile?.trim()) {
    const digits = String(mapped.mobile).replace(/\D/g, '');
    if (digits.length >= 7) {
      const [rows] = await pool.query(
        `SELECT id FROM ${table}
         WHERE deleted_at IS NULL AND REPLACE(REPLACE(REPLACE(mobile, '+', ''), ' ', ''), '-', '') LIKE ?
         LIMIT 1`,
        [`%${digits.slice(-7)}%`]
      );
      if (rows.length) return Number(rows[0].id);
    }
  }
  if (mapped.name?.trim()) {
    const [rows] = await pool.query(
      `SELECT id FROM ${table}
       WHERE deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM(?))
       LIMIT 1`,
      [mapped.name.trim()]
    );
    if (rows.length) return Number(rows[0].id);
  }
  return null;
}

async function importSupervisors(level, inputRows, { createLogins = false, photoIndex = null, attachPhotosOnSkip = true } = {}) {
  const table = tableForLevel(level);
  const summary = {
    created: 0,
    skipped: 0,
    loginAccountsCreated: 0,
    photosAttached: 0,
    photoWarnings: [],
    errors: [],
  };

  for (const raw of inputRows) {
    const rowNumber = raw.__rowNumber || null;
    const mapped = mapSupervisorRow(raw);
    if (!mapped.name.trim()) {
      summary.errors.push({ row: rowNumber, message: 'Name is required' });
      continue;
    }

    try {
      const photoEntry = photoIndex ? findPhotoForSupervisorRow(mapped, rowNumber, photoIndex) : null;
      const existingId = await findExistingSupervisor(level, mapped);

      if (existingId) {
        summary.skipped += 1;
        if (photoIndex && attachPhotosOnSkip && photoEntry) {
          try {
            const attached = await attachSupervisorPhoto(level, existingId, photoEntry);
            if (attached) summary.photosAttached += 1;
          } catch (photoErr) {
            summary.photoWarnings.push({
              row: rowNumber,
              message: photoErr.message || 'Failed to attach photo to existing supervisor',
            });
          }
        }
        continue;
      }

      const fields = supervisorInsertFields(mapped);
      const [result] = await pool.query(`INSERT INTO ${table} SET ?`, [fields]);
      const supervisorId = Number(result.insertId);
      summary.created += 1;

      const password = mapped.initialPassword.trim();
      if (createLogins && fields.email && password) {
        const existingUser = await findUserByEmail(fields.email);
        const userId = existingUser
          ? Number(existingUser.id)
          : await createSupervisorUser({
              name: fields.name,
              email: fields.email,
              password,
              forcePasswordChange: true,
            });
        if (!existingUser) summary.loginAccountsCreated += 1;
        await linkSupervisorUser(level, supervisorId, userId);
      }

      if (photoIndex && photoEntry) {
        try {
          const attached = await attachSupervisorPhoto(level, supervisorId, photoEntry);
          if (attached) summary.photosAttached += 1;
        } catch (photoErr) {
          summary.photoWarnings.push({
            row: rowNumber,
            message: photoErr.message || 'Supervisor created but photo upload failed',
          });
        }
      } else if (photoIndex && (mapped.photoFile || mapped.mobile)) {
        summary.photoWarnings.push({
          row: rowNumber,
          message: 'No matching photo found in zip for this row',
        });
      }
    } catch (err) {
      summary.errors.push({
        row: rowNumber,
        message: err.message || 'Failed to import row',
      });
    }
  }

  return summary;
}

async function importAssignments(level, inputRows) {
  const assignTable = assignmentTableForLevel(level);
  const supCol = supervisorIdColumn(level);
  const centerCol = centerIdColumn(level);
  const summary = { created: 0, skipped: 0, errors: [] };

  for (const raw of inputRows) {
    const rowNumber = raw.__rowNumber || null;
    const mapped = mapAssignmentRow(raw);

    if (!mapped.centerName.trim()) {
      summary.errors.push({ row: rowNumber, message: 'center_name is required' });
      continue;
    }
    if (!mapped.supervisorEmail.trim() && !mapped.supervisorName.trim()) {
      summary.errors.push({
        row: rowNumber,
        message: 'supervisor_email or supervisor_name is required',
      });
      continue;
    }

    try {
      const supervisor = await findSupervisorByIdentity(level, {
        email: mapped.supervisorEmail,
        name: mapped.supervisorName,
      });
      if (!supervisor) {
        summary.errors.push({ row: rowNumber, message: 'Supervisor not found' });
        continue;
      }

      const center = await findCenterByName(level, mapped);
      if (!center) {
        summary.errors.push({ row: rowNumber, message: 'Exam center not found' });
        continue;
      }

      const academicYear = mapped.academicYear.trim() || '2025/2026';
      const conflict = await findActiveAssignmentConflict(
        level,
        Number(supervisor.id),
        center.id,
        academicYear
      );
      if (conflict) {
        summary.errors.push({ row: rowNumber, message: conflict });
        continue;
      }

      const [existingPair] = await pool.query(
        `SELECT id FROM ${assignTable}
         WHERE ${supCol} = ? AND ${centerCol} = ? AND academic_year = ? AND deleted_at IS NULL
         LIMIT 1`,
        [supervisor.id, center.id, academicYear]
      );
      if (existingPair.length) {
        summary.skipped += 1;
        continue;
      }

      await pool.query(`INSERT INTO ${assignTable} SET ?`, [
        {
          [supCol]: Number(supervisor.id),
          [centerCol]: center.id,
          academic_year: academicYear,
          notes: mapped.notes.trim() || null,
        },
      ]);
      summary.created += 1;

      if (mapped.initialPassword.trim() && supervisor.email && !supervisor.user_id) {
        const userId = await createSupervisorUser({
          name: supervisor.name,
          email: supervisor.email,
          password: mapped.initialPassword.trim(),
          forcePasswordChange: true,
        });
        await linkSupervisorUser(level, Number(supervisor.id), userId);
      }
    } catch (err) {
      summary.errors.push({
        row: rowNumber,
        message: err.message || 'Failed to import assignment',
      });
    }
  }

  return summary;
}

function parseImportPayload(body, fileBuffer) {
  if (fileBuffer?.length) {
    return parseCsv(fileBuffer.toString('utf8'));
  }
  if (Array.isArray(body?.rows)) {
    return body.rows.map((row, index) => ({ ...row, __rowNumber: index + 2 }));
  }
  if (typeof body?.csv === 'string' && body.csv.trim()) {
    return parseCsv(body.csv);
  }
  return null;
}


async function importSupervisorsWithPhotos(level, inputRows, photoZipBuffer, options = {}) {
  const { buildPhotoIndexFromZip } = require('../utils/supervisorPhotoImport');
  const photoIndex = photoZipBuffer?.length ? buildPhotoIndexFromZip(photoZipBuffer) : null;
  return importSupervisors(level, inputRows, { ...options, photoIndex });
}

module.exports = {
  parseImportPayload,
  importSupervisors,
  importSupervisorsWithPhotos,
  importAssignments,
  mapSupervisorRow,
  mapAssignmentRow,
};
