const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'supervisors');

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function supervisorPhotoFileName(level, supervisorId, ext = '.jpg') {
  return `${level}_${supervisorId}${ext}`;
}

function supervisorPhotoPath(level, supervisorId) {
  ensureUploadDir();
  const base = supervisorPhotoFileName(level, supervisorId, '');
  const candidates = ['.jpg', '.jpeg', '.png', '.webp'].map((ext) =>
    path.join(UPLOAD_DIR, `${base}${ext}`)
  );
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function supervisorPhotoRelativeUrl(level, supervisorId, ext = '.jpg') {
  return `uploads/supervisors/${supervisorPhotoFileName(level, supervisorId, ext)}`;
}

async function saveSupervisorPhoto(level, supervisorId, buffer, mimeType) {
  ensureUploadDir();
  let ext = '.jpg';
  if (mimeType === 'image/png') ext = '.png';
  else if (mimeType === 'image/webp') ext = '.webp';

  for (const oldExt of ['.jpg', '.jpeg', '.png', '.webp']) {
    const oldPath = path.join(UPLOAD_DIR, supervisorPhotoFileName(level, supervisorId, oldExt));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const filePath = path.join(UPLOAD_DIR, supervisorPhotoFileName(level, supervisorId, ext));
  await fs.promises.writeFile(filePath, buffer);
  return supervisorPhotoRelativeUrl(level, supervisorId, ext);
}

function photoContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

module.exports = {
  UPLOAD_DIR,
  supervisorPhotoPath,
  saveSupervisorPhoto,
  photoContentType,
};
