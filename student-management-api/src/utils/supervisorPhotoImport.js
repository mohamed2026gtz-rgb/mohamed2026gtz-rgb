const path = require('path');
const AdmZip = require('adm-zip');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function mimeFromExt(ext) {
  const lower = ext.toLowerCase();
  if (lower === '.png') return 'image/png';
  if (lower === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\\/g, '/');
}

function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildPhotoIndexFromZip(zipBuffer) {
  if (!zipBuffer?.length) return new Map();

  const zip = new AdmZip(zipBuffer);
  const index = new Map();

  const add = (key, entry) => {
    const normalized = normalizeKey(key);
    if (!normalized || index.has(normalized)) return;
    index.set(normalized, entry);
  };

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const ext = path.extname(entry.entryName).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;

    const buffer = entry.getData();
    if (!buffer?.length) continue;

    const mimeType = mimeFromExt(ext);
    const photo = { buffer, mimeType, fileName: path.basename(entry.entryName) };
    const baseName = path.basename(entry.entryName, ext);
    const normalizedFile = normalizeKey(photo.fileName);

    add(normalizedFile, photo);
    add(baseName, photo);

    const mobileDigits = digitsOnly(baseName);
    if (mobileDigits) {
      add(`mobile:${mobileDigits}`, photo);
      if (mobileDigits.length >= 7) {
        add(`mobile:${mobileDigits.slice(-7)}`, photo);
      }
    }

    if (/^\d+$/.test(baseName)) {
      add(`row:${baseName}`, photo);
      add(`row:${Number(baseName)}`, photo);
    }

    const slug = slugifyName(baseName);
    if (slug) add(`name:${slug}`, photo);
  }

  return index;
}

function findPhotoForSupervisorRow(mapped, rowNumber, index) {
  if (!index?.size) return null;

  const photoFile = mapped.photoFile?.trim();
  if (photoFile) {
    const keys = [normalizeKey(photoFile), normalizeKey(path.basename(photoFile))];
    for (const key of keys) {
      if (index.has(key)) return index.get(key);
    }
  }

  const mobileDigits = digitsOnly(mapped.mobile);
  if (mobileDigits) {
    const mobileKeys = [
      `mobile:${mobileDigits}`,
      mobileDigits.length >= 7 ? `mobile:${mobileDigits.slice(-7)}` : null,
      mobileDigits,
    ].filter(Boolean);
    for (const key of mobileKeys) {
      if (index.has(key)) return index.get(key);
    }
  }

  if (rowNumber != null) {
    for (const key of [`row:${rowNumber}`, `row:${String(rowNumber)}`]) {
      if (index.has(key)) return index.get(key);
    }
  }

  const nameSlug = slugifyName(mapped.name);
  if (nameSlug && index.has(`name:${nameSlug}`)) {
    return index.get(`name:${nameSlug}`);
  }

  return null;
}

module.exports = {
  buildPhotoIndexFromZip,
  findPhotoForSupervisorRow,
  slugifyName,
  digitsOnly,
};