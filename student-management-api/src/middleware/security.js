const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const INJECTION_CHARS = /[<>'"`;\\]/g;

function sanitizeString(value, maxLength = 500) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  return value.replace(CONTROL_CHARS, '').replace(INJECTION_CHARS, '').trim().slice(0, maxLength);
}

/** Shallow sanitize string fields on query and body to reduce injection risk. */
function sanitizeInputs(req, _res, next) {
  if (req.query && typeof req.query === 'object') {
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string') req.query[key] = sanitizeString(val, 200);
    }
  }
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    for (const [key, val] of Object.entries(req.body)) {
      if (typeof val === 'string' && key !== 'password' && key !== 'currentPassword' && key !== 'newPassword') {
        req.body[key] = sanitizeString(val, 2000);
      }
    }
  }
  next();
}

module.exports = { sanitizeInputs, sanitizeString };
