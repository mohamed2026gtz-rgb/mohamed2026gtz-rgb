export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

export function isValidMobile(mobile: string): boolean {
  const value = mobile.trim();
  if (!value) return true;
  const cleaned = value.replace(/[\s\-().]/g, '');
  if (/^(\+?252|0)?[67]\d{8}$/.test(cleaned)) return true;
  if (/^\+?\d{9,15}$/.test(cleaned)) return true;
  return false;
}

export function normalizeMobile(mobile: string): string {
  const cleaned = mobile.trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return '';
  if (/^0[67]\d{8}$/.test(cleaned)) return `+252${cleaned.slice(1)}`;
  if (/^252[67]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

export const SEX_OPTIONS = ['Male', 'Female'] as const;

export function getEmailError(email: string, required = false): string | null {
  const value = email.trim();
  if (!value) return required ? 'Email is required' : null;
  if (!isValidEmail(value)) return 'Enter a valid email (e.g. name@example.com)';
  return null;
}

export function getMobileError(mobile: string, required = false): string | null {
  const value = mobile.trim();
  if (!value) return required ? 'Telephone is required' : null;
  if (!isValidMobile(value)) return 'Enter a valid number (e.g. +252612345678 or 0612345678)';
  return null;
}
