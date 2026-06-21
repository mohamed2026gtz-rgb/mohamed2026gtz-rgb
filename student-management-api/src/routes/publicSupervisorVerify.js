const express = require('express');
const fs = require('fs');
const { pool } = require('../config/db');
const { supervisorPhotoPath, photoContentType } = require('../utils/supervisorPhoto');

const router = express.Router();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function readPhotoDataUrl(level, supervisorId) {
  const filePath = supervisorPhotoPath(level, supervisorId);
  if (!filePath) return null;

  try {
    const buffer = fs.readFileSync(filePath);
    const mime = photoContentType(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

async function fetchAssignment(level, assignmentId) {
  const assignTable = assignmentTableForLevel(level);
  const supCol = supervisorIdColumn(level);
  const centerCol = centerIdColumn(level);

  let sql;
  if (level === 'secondary') {
    sql = `
      SELECT a.id, a.academic_year, a.${supCol} AS supervisor_id,
        s.name AS supervisor_name,
        ec.center_name,
        sch.region
      FROM ${assignTable} a
      INNER JOIN secondary_supervisors s ON a.${supCol} = s.id
      INNER JOIN exam_centers ec ON a.${centerCol} = ec.id
      LEFT JOIN schools_management sch ON ec.school_id = sch.school_id
      WHERE a.id = ? AND a.deleted_at IS NULL AND s.deleted_at IS NULL
      LIMIT 1`;
  } else {
    sql = `
      SELECT a.id, a.academic_year, a.${supCol} AS supervisor_id,
        s.name AS supervisor_name,
        pec.center_name,
        pec.region
      FROM ${assignTable} a
      INNER JOIN primary_supervisors s ON a.${supCol} = s.id
      INNER JOIN primary_exam_centers pec ON a.${centerCol} = pec.id
      WHERE a.id = ? AND a.deleted_at IS NULL AND s.deleted_at IS NULL
      LIMIT 1`;
  }

  const [rows] = await pool.query(sql, [assignmentId]);
  return rows[0] || null;
}

function renderVerifyPage({ levelLabel, supervisorName, centerName, region, academicYear, photoDataUrl }) {
  const photoBlock = photoDataUrl
    ? `<img src="${photoDataUrl}" alt="${escapeHtml(supervisorName)}" class="photo" />`
    : '<div class="photo photo--missing">No photo on record</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(supervisorName)} - Supervisor Verification</title>
  <style>
    :root { --green: #0f4d31; --green-soft: #1a6b45; --gold: #c9a227; --bg: #f4f7fb; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(180deg, #e8eef5 0%, var(--bg) 100%);
      color: #1e293b;
      min-height: 100vh;
      padding: 24px 16px;
    }
    .card {
      max-width: 420px;
      margin: 0 auto;
      background: #fff;
      border: 2px solid rgba(26, 107, 69, 0.25);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(15, 77, 49, 0.14);
    }
    .header {
      padding: 18px 20px;
      background: linear-gradient(135deg, var(--green) 0%, var(--green-soft) 100%);
      color: #fff;
      text-align: center;
    }
    .header h1 { margin: 0 0 6px; font-size: 18px; line-height: 1.3; }
    .header p { margin: 0; font-size: 13px; opacity: 0.92; }
    .body { padding: 20px; text-align: center; }
    .photo {
      width: 140px;
      height: 168px;
      object-fit: cover;
      object-position: center top;
      border: 3px solid var(--green-soft);
      border-radius: 8px;
      background: #eef4f0;
    }
    .photo--missing {
      display: grid;
      place-items: center;
      margin: 0 auto;
      font-size: 12px;
      color: #64748b;
      padding: 12px;
    }
    .name { margin: 16px 0 6px; font-size: 22px; font-weight: 700; color: var(--green); }
    .meta { margin: 0; font-size: 14px; color: #475569; line-height: 1.5; }
    .badge {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 12px;
      border-radius: 999px;
      background: #f5ecd0;
      border: 1px solid var(--gold);
      color: var(--green);
      font-size: 12px;
      font-weight: 600;
    }
    .footer {
      padding: 14px 20px 18px;
      border-top: 1px solid #e2ebe6;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${escapeHtml(levelLabel)} Examination Supervisor</h1>
      <p>Somaliland National Examination &amp; Certification Board</p>
    </div>
    <div class="body">
      ${photoBlock}
      <h2 class="name">${escapeHtml(supervisorName)}</h2>
      <p class="meta"><strong>Exam center:</strong> ${escapeHtml(centerName)}</p>
      ${region ? `<p class="meta"><strong>Region:</strong> ${escapeHtml(region)}</p>` : ''}
      ${academicYear ? `<p class="meta"><strong>Academic year:</strong> ${escapeHtml(academicYear)}</p>` : ''}
      <span class="badge">Verified supervisor credential</span>
    </div>
    <div class="footer">Scan issued by SLNECB</div>
  </div>
</body>
</html>`;
}

router.get('/supervisor-verify/:level/:assignmentId', async (req, res, next) => {
  try {
    const level = req.params.level === 'secondary' ? 'secondary' : 'primary';
    const assignmentId = Number(req.params.assignmentId);
    if (!Number.isFinite(assignmentId) || assignmentId <= 0) {
      return res.status(400).type('text').send('Invalid assignment id');
    }

    const row = await fetchAssignment(level, assignmentId);
    if (!row) {
      return res.status(404).type('text').send('Supervisor assignment not found');
    }

    const levelLabel = level === 'primary' ? 'Primary' : 'Secondary';
    const photoDataUrl = readPhotoDataUrl(level, Number(row.supervisor_id));

    res.type('html').send(
      renderVerifyPage({
        levelLabel,
        supervisorName: row.supervisor_name || 'Supervisor',
        centerName: row.center_name || 'Exam center',
        region: row.region || null,
        academicYear: row.academic_year || null,
        photoDataUrl,
      })
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;