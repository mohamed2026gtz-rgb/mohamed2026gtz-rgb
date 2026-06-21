function isValidEmail(email) {
  const value = String(email || '').trim();
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function isValidMobile(mobile) {
  const value = String(mobile || '').trim();
  if (!value) return true;
  const cleaned = value.replace(/[\s\-().]/g, '');
  if (/^(\+?252|0)?[67]\d{8}$/.test(cleaned)) return true;
  if (/^\+?\d{9,15}$/.test(cleaned)) return true;
  return false;
}

function normalizeMobile(mobile) {
  const cleaned = String(mobile || '').trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return null;
  if (/^0[67]\d{8}$/.test(cleaned)) return `+252${cleaned.slice(1)}`;
  if (/^252[67]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+252[67]\d{8}$/.test(cleaned)) return cleaned;
  return cleaned;
}

function isValidSex(sex) {
  if (!sex) return true;
  return ['Male', 'Female'].includes(String(sex).trim());
}

module.exports = { isValidEmail, isValidMobile, normalizeMobile, isValidSex };
