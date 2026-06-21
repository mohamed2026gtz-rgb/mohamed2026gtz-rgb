const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { pool } = require('../config/db');
const { authenticate, requireAdministration } = require('../middleware/auth');
const { toSupervisorDto, supervisorInsertFields } = require('../utils/supervisorMappers');
const {
  saveSupervisorPhoto,
  supervisorPhotoPath,
  photoContentType,
} = require('../utils/supervisorPhoto');
const {
  createSupervisorUser,
  linkSupervisorUser,
  findUserByEmail,
} = require('../services/supervisorUserService');
const {
  parseImportPayload,
  importSupervisors,
  importSupervisorsWithPhotos,
  importAssignments,
} = require('../services/supervisorImportService');
const {
  getRegionScopeForUser,
  buildSupervisorRegionFilter,
  assertSupervisorRegionAccess,
  applyRegionScopeToFields,
  applyRegionScopeToImportRows,
} = require('../services/supervisorRegionScope');

const router = express.Router();
router.use(authenticate, requireAdministration);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function mapSupervisorRow(row, level) {
  return toSupervisorDto({ ...row, _level: level });
}

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

function optionalPhotoUpload(req, res, next) {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('multipart/form-data')) {
    return upload.single('photo')(req, res, next);
  }
  return next();
}

async function denyRegionScope(req, res) {
  const regionScope = await getRegionScopeForUser(req.user);
  if (regionScope) {
    res.status(403).json({ message: 'This action is not available for region staff accounts' });
    return true;
  }
  return false;
}

async function importSupervisorsHandler(level, req, res, next) {
  try {
    if (await denyRegionScope(req, res)) return;

    const rows = parseImportPayload(req.body, req.file?.buffer);
    if (!rows?.length) {
      return res.status(400).json({ message: 'Upload a CSV file or provide rows[] in the request body' });
    }

    const createLogins =
      req.body?.createLogins === true ||
      req.body?.createLogins === 'true' ||
      String(req.query.createLogins || '').toLowerCase() === 'true';

    const summary = await importSupervisors(level, rows, { createLogins });
    res.status(summary.errors.length && !summary.created ? 400 : 200).json({
      ...summary,
      totalRows: rows.length,
      message: `Imported ${summary.created} supervisor(s), skipped ${summary.skipped}, ${summary.errors.length} error(s)`,
    });
  } catch (err) {
    next(err);
  }
}


async function importSupervisorsWithPhotosHandler(level, req, res, next) {
  try {
    const csvFile = req.files?.file?.[0];
    const photosZip = req.files?.photos?.[0];
    let rows = parseImportPayload(req.body, csvFile?.buffer);
    if (!rows?.length) {
      return res.status(400).json({ message: 'Upload a CSV file with supervisor rows' });
    }
    if (!photosZip?.buffer?.length) {
      return res.status(400).json({ message: 'Upload a ZIP file containing supervisor photos' });
    }

    const regionScope = await getRegionScopeForUser(req.user);
    if (regionScope) {
      rows = applyRegionScopeToImportRows(rows, regionScope);
    }

    const createLogins =
      req.body?.createLogins === true ||
      req.body?.createLogins === 'true' ||
      String(req.query.createLogins || '').toLowerCase() === 'true';

    const summary = await importSupervisorsWithPhotos(level, rows, photosZip.buffer, { createLogins });
    res.status(summary.errors.length && !summary.created ? 400 : 200).json({
      ...summary,
      totalRows: rows.length,
      message: `Imported ${summary.created} supervisor(s), attached ${summary.photosAttached || 0} photo(s), skipped ${summary.skipped}, ${summary.errors.length} error(s)`,
    });
  } catch (err) {
    next(err);
  }
}

async function importAssignmentsHandler(level, req, res, next) {
  try {
    if (await denyRegionScope(req, res)) return;

    const rows = parseImportPayload(req.body, req.file?.buffer);
    if (!rows?.length) {
      return res.status(400).json({ message: 'Upload a CSV file or provide rows[] in the request body' });
    }

    const summary = await importAssignments(level, rows);
    res.status(summary.errors.length && !summary.created ? 400 : 200).json({
      ...summary,
      totalRows: rows.length,
      message: `Created ${summary.created} assignment(s), skipped ${summary.skipped}, ${summary.errors.length} error(s)`,
    });
  } catch (err) {
    next(err);
  }
}

async function listSupervisors(level, req, res, next) {
  try {
    const table = tableForLevel(level);
    const { search } = req.query;
    const regionScope = await getRegionScopeForUser(req.user);
    let sql = `SELECT * FROM ${table} WHERE deleted_at IS NULL`;
    const params = [];
    if (regionScope) {
      const regionFilter = buildSupervisorRegionFilter(regionScope);
      sql += regionFilter.sql;
      params.push(...regionFilter.params);
    }
    if (search?.trim()) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR mobile LIKE ? OR region LIKE ? OR current_institution LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }
    sql += ' ORDER BY name';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map((row) => mapSupervisorRow(row, level)));
  } catch (err) {
    next(err);
  }
}

async function getSupervisor(level, req, res, next) {
  try {
    const id = Number(req.params.id);
    const access = await assertSupervisorRegionAccess(req.user, level, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const table = tableForLevel(level);
    const [rows] = await pool.query(
      `SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Supervisor not found' });
    res.json(mapSupervisorRow(rows[0], level));
  } catch (err) {
    next(err);
  }
}

async function createSupervisor(level, req, res, next) {
  try {
    const regionScope = await getRegionScopeForUser(req.user);
    if (regionScope && !req.file?.buffer?.length) {
      return res.status(400).json({ message: 'Supervisor photo is required for region staff' });
    }

    let fields = supervisorInsertFields(req.body);
    fields = applyRegionScopeToFields(fields, regionScope);
    if (regionScope && !fields.region) {
      return res.status(400).json({ message: 'Your region assignment could not be resolved' });
    }
    if (!fields.name) return res.status(400).json({ message: 'Name is required' });

    const initialPassword = String(req.body.initialPassword || '').trim();
    const email = fields.email;
    if (initialPassword && !email) {
      return res.status(400).json({ message: 'Email is required when setting an initial login password' });
    }

    const table = tableForLevel(level);
    const [result] = await pool.query(`INSERT INTO ${table} SET ?`, [fields]);
    const supervisorId = Number(result.insertId);

    if (req.file?.buffer?.length) {
      const imageUrl = await saveSupervisorPhoto(
        level,
        supervisorId,
        req.file.buffer,
        req.file.mimetype || 'image/jpeg'
      );
      await pool.query(`UPDATE ${table} SET image_url = ? WHERE id = ?`, [imageUrl, supervisorId]);
    }

    let loginCreated = false;
    if (email && initialPassword) {
      const existingUser = await findUserByEmail(email);
      let userId;
      if (existingUser) {
        userId = Number(existingUser.id);
      } else {
        userId = await createSupervisorUser({
          name: fields.name,
          email,
          password: initialPassword,
          forcePasswordChange: true,
        });
        loginCreated = true;
      }
      await linkSupervisorUser(level, supervisorId, userId);
    }

    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [supervisorId]);
    res.status(201).json({
      ...mapSupervisorRow(rows[0], level),
      loginAccountCreated: loginCreated,
      message: loginCreated
        ? 'Supervisor registered. They must change password on first login.'
        : email && initialPassword
          ? 'Supervisor linked to existing login account.'
          : undefined,
    });
  } catch (err) {
    if (err.statusCode === 400 || err.message?.includes('email') || err.message?.includes('password') || err.message?.includes('telephone') || err.message?.includes('valid') || err.message?.includes('Sex')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

async function uploadSupervisorPhoto(level, req, res, next) {
  try {
    const table = tableForLevel(level);
    const id = Number(req.params.id);
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: 'Photo file is required' });
    }

    const access = await assertSupervisorRegionAccess(req.user, level, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const [rows] = await pool.query(
      `SELECT id FROM ${table} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Supervisor not found' });

    const imageUrl = await saveSupervisorPhoto(
      level,
      id,
      req.file.buffer,
      req.file.mimetype || 'image/jpeg'
    );
    await pool.query(`UPDATE ${table} SET image_url = ? WHERE id = ?`, [imageUrl, id]);

    const [updated] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    res.json(mapSupervisorRow(updated[0], level));
  } catch (err) {
    next(err);
  }
}

async function getSupervisorPhoto(level, req, res, next) {
  try {
    const id = Number(req.params.id);
    const access = await assertSupervisorRegionAccess(req.user, level, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const filePath = supervisorPhotoPath(level, id);
    if (!filePath) return res.status(404).json({ message: 'Supervisor photo not found' });

    res.setHeader('Content-Type', photoContentType(filePath));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).json({ message: 'Cannot read supervisor photo' });
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function updateSupervisor(level, req, res, next) {
  try {
    const table = tableForLevel(level);
    const id = Number(req.params.id);
    const access = await assertSupervisorRegionAccess(req.user, level, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    let fields = supervisorInsertFields(req.body);
    fields = applyRegionScopeToFields(fields, access.regionScope);
    if (!fields.name) return res.status(400).json({ message: 'Name is required' });
    const [result] = await pool.query(
      `UPDATE ${table} SET ? WHERE id = ? AND deleted_at IS NULL`,
      [fields, id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Supervisor not found' });
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    res.json(mapSupervisorRow(rows[0], level));
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

async function deleteSupervisor(level, req, res, next) {
  try {
    if (await denyRegionScope(req, res)) return;

    const table = tableForLevel(level);
    const id = Number(req.params.id);
    const [result] = await pool.query(
      `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Supervisor not found' });
    res.json({ message: 'Supervisor deleted' });
  } catch (err) {
    next(err);
  }
}

async function listAssignments(level, req, res, next) {
  try {
    const assignTable = assignmentTableForLevel(level);
    const supCol = supervisorIdColumn(level);
    const centerCol = centerIdColumn(level);
    const { supervisorId, centerId, academicYear } = req.query;

    let sql = `
      SELECT a.*,
        s.name AS supervisor_name,
        s.mobile AS supervisor_mobile,
        s.email AS supervisor_email
    `;
    if (level === 'secondary') {
      sql += `, ec.center_name, ec.school_number, sch.school_level, sch.region,
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
        FROM ${assignTable} a
        INNER JOIN secondary_supervisors s ON a.${supCol} = s.id
        INNER JOIN exam_centers ec ON a.${centerCol} = ec.id
        LEFT JOIN schools_management sch ON ec.school_id = sch.school_id
        WHERE a.deleted_at IS NULL AND s.deleted_at IS NULL`;
    } else {
      sql += `, pec.center_name, pec.region, pec.district, pec.school_count,
        (SELECT COUNT(*)
         FROM students_management st
         INNER JOIN schools_management sch ON st.school_id = sch.school_id
         WHERE st.deleted_at IS NULL AND sch.school_level = 'Primary'
           AND TRIM(sch.exam_center_name) = TRIM(pec.center_name)
           AND (pec.region IS NULL OR sch.region = pec.region)
           AND (pec.district IS NULL OR sch.district = pec.district)) AS student_count
        FROM ${assignTable} a
        INNER JOIN primary_supervisors s ON a.${supCol} = s.id
        INNER JOIN primary_exam_centers pec ON a.${centerCol} = pec.id
        WHERE a.deleted_at IS NULL AND s.deleted_at IS NULL`;
    }

    const params = [];
    if (supervisorId) {
      sql += ` AND a.${supCol} = ?`;
      params.push(Number(supervisorId));
    }
    if (centerId) {
      sql += ` AND a.${centerCol} = ?`;
      params.push(Number(centerId));
    }
    if (academicYear?.trim()) {
      sql += ' AND a.academic_year = ?';
      params.push(academicYear.trim());
    }
    sql += ' ORDER BY s.name, a.assigned_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        supervisorId: Number(r[supCol]),
        centerId: Number(r[centerCol]),
        academicYear: r.academic_year,
        assignedAt: r.assigned_at,
        notes: r.notes,
        supervisorName: r.supervisor_name,
        supervisorMobile: r.supervisor_mobile,
        supervisorEmail: r.supervisor_email,
        centerName: r.center_name,
        region: r.region || null,
        district: r.district || null,
        schoolLevel: r.school_level || 'Primary',
        schoolNumber: r.school_number || null,
        schoolCount: r.school_count != null ? Number(r.school_count) : null,
        studentCount: r.student_count != null ? Number(r.student_count) : null,
      }))
    );
  } catch (err) {
    next(err);
  }
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
    return {
      message: `This supervisor is already assigned to exam center "${bySupervisor[0].center_name}" for ${academicYear}. Remove that assignment first.`,
    };
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
    return {
      message: `This exam center already has supervisor "${byCenter[0].supervisor_name}" for ${academicYear}. Remove that assignment first.`,
    };
  }

  return null;
}

async function createAssignment(level, req, res, next) {
  try {
    if (await denyRegionScope(req, res)) return;

    const assignTable = assignmentTableForLevel(level);
    const supCol = supervisorIdColumn(level);
    const centerCol = centerIdColumn(level);
    const supervisorId = Number(req.body.supervisorId);
    const centerId = Number(req.body.centerId);
    const academicYear = (req.body.academicYear || '2025/2026').trim();
    const notes = req.body.notes?.trim() || null;

    if (!supervisorId || !centerId) {
      return res.status(400).json({ message: 'supervisorId and centerId are required' });
    }

    const supTable = tableForLevel(level);
    const [supRows] = await pool.query(
      `SELECT id FROM ${supTable} WHERE id = ? AND deleted_at IS NULL`,
      [supervisorId]
    );
    if (!supRows.length) return res.status(404).json({ message: 'Supervisor not found' });

    if (level === 'secondary') {
      const [centerRows] = await pool.query(
        'SELECT id FROM exam_centers WHERE id = ? AND deleted_at IS NULL',
        [centerId]
      );
      if (!centerRows.length) return res.status(404).json({ message: 'Exam center not found' });
    } else {
      const [centerRows] = await pool.query(
        'SELECT id FROM primary_exam_centers WHERE id = ? AND is_active = 1',
        [centerId]
      );
      if (!centerRows.length) return res.status(404).json({ message: 'Primary exam center not found' });
    }

    const conflict = await findActiveAssignmentConflict(
      level,
      supervisorId,
      centerId,
      academicYear
    );
    if (conflict) {
      return res.status(409).json({ message: conflict.message });
    }

    const [existingPair] = await pool.query(
      `SELECT id FROM ${assignTable}
       WHERE ${supCol} = ? AND ${centerCol} = ? AND academic_year = ? AND deleted_at IS NULL
       LIMIT 1`,
      [supervisorId, centerId, academicYear]
    );
    if (existingPair.length) {
      return res.status(409).json({
        message: 'This supervisor is already assigned to this exam center for this academic year',
      });
    }

    const payload = {
      [supCol]: supervisorId,
      [centerCol]: centerId,
      academic_year: academicYear,
      notes,
    };

    const [result] = await pool.query(`INSERT INTO ${assignTable} SET ?`, [payload]);

    const [supRow] = await pool.query(
      `SELECT id, name, email, user_id FROM ${supTable} WHERE id = ? LIMIT 1`,
      [supervisorId]
    );
    if (supRow.length && supRow[0].email && !supRow[0].user_id) {
      const tempPassword = String(req.body.initialPassword || req.body.temporaryPassword || '').trim();
      if (tempPassword) {
        const userId = await createSupervisorUser({
          name: supRow[0].name,
          email: supRow[0].email,
          password: tempPassword,
          forcePasswordChange: true,
        });
        await linkSupervisorUser(level, supervisorId, userId);
      }
    }

    res.status(201).json({
      id: Number(result.insertId),
      supervisorId,
      centerId,
      academicYear,
      notes,
      message: 'Supervisor assigned to exam center (one supervisor per center)',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message:
          'One-to-one rule: each supervisor and each exam center can have only one assignment per academic year',
      });
    }
    next(err);
  }
}

async function deleteAssignment(level, req, res, next) {
  try {
    if (await denyRegionScope(req, res)) return;

    const assignTable = assignmentTableForLevel(level);
    const id = Number(req.params.id);
    const [result] = await pool.query(
      `DELETE FROM ${assignTable} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    next(err);
  }
}

// Primary supervisors (specific paths before :id)
router.post('/primary/import', upload.single('file'), (req, res, next) =>
  importSupervisorsHandler('primary', req, res, next)
);
router.post(
  '/primary/import-with-photos',
  importUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'photos', maxCount: 1 },
  ]),
  (req, res, next) => importSupervisorsWithPhotosHandler('primary', req, res, next)
);
router.post('/primary/assignments/import', upload.single('file'), (req, res, next) =>
  importAssignmentsHandler('primary', req, res, next)
);
router.get('/primary/assignments/list', authenticate, (req, res, next) =>
  listAssignments('primary', req, res, next)
);
router.post('/primary/assignments', authenticate, (req, res, next) =>
  createAssignment('primary', req, res, next)
);
router.delete('/primary/assignments/:id', authenticate, (req, res, next) =>
  deleteAssignment('primary', req, res, next)
);

router.get('/primary', authenticate, (req, res, next) => listSupervisors('primary', req, res, next));
router.post('/primary', authenticate, optionalPhotoUpload, (req, res, next) =>
  createSupervisor('primary', req, res, next)
);
router.get('/primary/:id/photo', authenticate, (req, res, next) =>
  getSupervisorPhoto('primary', req, res, next)
);
router.post('/primary/:id/photo', authenticate, upload.single('photo'), (req, res, next) =>
  uploadSupervisorPhoto('primary', req, res, next)
);
router.get('/primary/:id', authenticate, (req, res, next) => getSupervisor('primary', req, res, next));
router.put('/primary/:id', authenticate, (req, res, next) => updateSupervisor('primary', req, res, next));
router.delete('/primary/:id', authenticate, (req, res, next) => deleteSupervisor('primary', req, res, next));

// Secondary supervisors (specific paths before :id)
router.post('/secondary/import', upload.single('file'), (req, res, next) =>
  importSupervisorsHandler('secondary', req, res, next)
);
router.post(
  '/secondary/import-with-photos',
  importUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'photos', maxCount: 1 },
  ]),
  (req, res, next) => importSupervisorsWithPhotosHandler('secondary', req, res, next)
);
router.post('/secondary/assignments/import', upload.single('file'), (req, res, next) =>
  importAssignmentsHandler('secondary', req, res, next)
);
router.get('/secondary/assignments/list', authenticate, (req, res, next) =>
  listAssignments('secondary', req, res, next)
);
router.post('/secondary/assignments', authenticate, (req, res, next) =>
  createAssignment('secondary', req, res, next)
);
router.delete('/secondary/assignments/:id', authenticate, (req, res, next) =>
  deleteAssignment('secondary', req, res, next)
);

router.get('/secondary', authenticate, (req, res, next) => listSupervisors('secondary', req, res, next));
router.post('/secondary', authenticate, optionalPhotoUpload, (req, res, next) =>
  createSupervisor('secondary', req, res, next)
);
router.get('/secondary/:id/photo', authenticate, (req, res, next) =>
  getSupervisorPhoto('secondary', req, res, next)
);
router.post('/secondary/:id/photo', authenticate, upload.single('photo'), (req, res, next) =>
  uploadSupervisorPhoto('secondary', req, res, next)
);
router.get('/secondary/:id', authenticate, (req, res, next) => getSupervisor('secondary', req, res, next));
router.put('/secondary/:id', authenticate, (req, res, next) => updateSupervisor('secondary', req, res, next));
router.delete('/secondary/:id', authenticate, (req, res, next) => deleteSupervisor('secondary', req, res, next));

module.exports = router;
