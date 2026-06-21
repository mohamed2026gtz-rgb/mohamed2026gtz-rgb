const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'services', 'supervisorImportService.js');
let content = fs.readFileSync(target, 'utf8');

content = content.replace(
  `} = require('./supervisorUserService');`,
  `} = require('./supervisorUserService');
const { saveSupervisorPhoto } = require('../utils/supervisorPhoto');
const { findPhotoForSupervisorRow } = require('../utils/supervisorPhotoImport');`
);

content = content.replace(
  `    residency: row.residency || row.residence || '',
    email: row.email || row.email_address || '',`,
  `    residency: row.residency || row.residence || '',
    region: row.region || '',
    email: row.email || row.email_address || '',`
);

content = content.replace(
  `    initialPassword: row.initial_password || row.password || row.temporary_password || '',
  };
};

function mapAssignmentRow(row) {`,
  `    initialPassword: row.initial_password || row.password || row.temporary_password || '',
    photoFile: row.photo_file || row.photo || row.photo_filename || row.image || '',
  };
};

function mapAssignmentRow(row) {`
);

const attachFn = `
async function attachSupervisorPhoto(level, supervisorId, photoEntry) {
  if (!photoEntry?.buffer?.length) return false;
  const table = tableForLevel(level);
  const imageUrl = await saveSupervisorPhoto(
    level,
    supervisorId,
    photoEntry.buffer,
    photoEntry.mimeType || 'image/jpeg'
  );
  await pool.query(\`UPDATE \${table} SET image_url = ? WHERE id = ?\`, [imageUrl, supervisorId]);
  return true;
}

async function findExistingSupervisor(level, mapped) {
  const table = tableForLevel(level);
  if (mapped.email?.trim()) {
    const [rows] = await pool.query(
      \`SELECT id FROM \${table}
       WHERE deleted_at IS NULL AND LOWER(TRIM(email)) = LOWER(TRIM(?))
       LIMIT 1\`,
      [mapped.email.trim()]
    );
    if (rows.length) return Number(rows[0].id);
  }
  if (mapped.mobile?.trim()) {
    const digits = String(mapped.mobile).replace(/\\D/g, '');
    if (digits.length >= 7) {
      const [rows] = await pool.query(
        \`SELECT id FROM \${table}
         WHERE deleted_at IS NULL AND REPLACE(REPLACE(REPLACE(mobile, '+', ''), ' ', ''), '-', '') LIKE ?
         LIMIT 1\`,
        [\`%\${digits.slice(-7)}%\`]
      );
      if (rows.length) return Number(rows[0].id);
    }
  }
  if (mapped.name?.trim()) {
    const [rows] = await pool.query(
      \`SELECT id FROM \${table}
       WHERE deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM(?))
       LIMIT 1\`,
      [mapped.name.trim()]
    );
    if (rows.length) return Number(rows[0].id);
  }
  return null;
}
`;

content = content.replace(
  'async function importSupervisors(level, inputRows, { createLogins = false } = {}) {',
  `${attachFn}
async function importSupervisors(level, inputRows, { createLogins = false, photoIndex = null, attachPhotosOnSkip = true } = {}) {`
);

content = content.replace(
  `  const summary = { created: 0, skipped: 0, loginAccountsCreated: 0, errors: [] };`,
  `  const summary = {
    created: 0,
    skipped: 0,
    loginAccountsCreated: 0,
    photosAttached: 0,
    photoWarnings: [],
    errors: [],
  };`
);

const oldBlock = `    try {
      if (mapped.email) {
        const [existing] = await pool.query(
          \`SELECT id FROM \${table}
           WHERE deleted_at IS NULL AND LOWER(TRIM(email)) = LOWER(TRIM(?))
           LIMIT 1\`,
          [mapped.email.trim()]
        );
        if (existing.length) {
          summary.skipped += 1;
          continue;
        }
      }

      const fields = supervisorInsertFields(mapped);
      const [result] = await pool.query(\`INSERT INTO \${table} SET ?\`, [fields]);
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
    } catch (err) {`;

const newBlock = `    try {
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
      const [result] = await pool.query(\`INSERT INTO \${table} SET ?\`, [fields]);
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
    } catch (err) {`;

if (!content.includes(oldBlock)) {
  console.error('Could not find import block to replace');
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

const importWithPhotos = `
async function importSupervisorsWithPhotos(level, inputRows, photoZipBuffer, options = {}) {
  const { buildPhotoIndexFromZip } = require('../utils/supervisorPhotoImport');
  const photoIndex = photoZipBuffer?.length ? buildPhotoIndexFromZip(photoZipBuffer) : null;
  return importSupervisors(level, inputRows, { ...options, photoIndex });
}
`;

content = content.replace(
  'module.exports = {',
  `${importWithPhotos}
module.exports = {`
);

content = content.replace(
  '  importSupervisors,',
  '  importSupervisors,\n  importSupervisorsWithPhotos,'
);

fs.writeFileSync(target, content, 'utf8');
console.log('Patched', target);
