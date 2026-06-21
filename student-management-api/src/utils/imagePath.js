const fs = require('fs');
const path = require('path');

const SHARE_HOST = process.env.IMAGE_SHARE_HOST || '192.168.20.90';
const SHARE_ROOT = process.env.IMAGE_SHARE_ROOT || `\\\\${SHARE_HOST}\\Groups2026`;

function normalizeImagePath(imageUrl) {
  if (!imageUrl || !String(imageUrl).trim()) return null;

  let filePath = String(imageUrl).trim().replace(/\//g, '\\');

  // MySQL UNC paths: ensure \\server\share format (two leading backslashes).
  if (/^\\*192\.168\./.test(filePath) || /^\\*[^\\]+\\/.test(filePath)) {
    filePath = filePath.replace(/^\\+/, '\\\\');
  }

  return filePath;
}

function buildPathCandidates(imageUrl) {
  const normalized = normalizeImagePath(imageUrl);
  if (!normalized) return [];

  const candidates = [normalized];

  // Windows share paths are case-insensitive — try images/IMAGES variants.
  if (/\\images\\/i.test(normalized)) {
    candidates.push(normalized.replace(/\\images\\/i, '\\IMAGES\\'));
    candidates.push(normalized.replace(/\\IMAGES\\/i, '\\images\\'));
  }

  // If DB path is relative to share, resolve against configured root.
  if (!normalized.startsWith('\\\\') && SHARE_ROOT) {
    const joined = path.win32.join(SHARE_ROOT, normalized);
    candidates.push(joined);
  }

  return [...new Set(candidates)];
}

function resolveImageFile(imageUrl) {
  for (const candidate of buildPathCandidates(imageUrl)) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function photoContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function hasStudentPicture(row) {
  return (
    row.image_status === 'has_image' ||
    (row.image_url && String(row.image_url).trim() !== '')
  );
}

function canAccessShare() {
  try {
    return fs.existsSync(SHARE_ROOT);
  } catch {
    return false;
  }
}

module.exports = {
  normalizeImagePath,
  buildPathCandidates,
  resolveImageFile,
  photoContentType,
  hasStudentPicture,
  canAccessShare,
  SHARE_HOST,
  SHARE_ROOT,
};
