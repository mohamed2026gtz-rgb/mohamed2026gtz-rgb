/** Strip control chars and trim user-provided search / text inputs. */
export function sanitizeSearchInput(value: string, maxLength = 200): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>'"`;\\]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizePlainText(value: string, maxLength = 500): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: string): string {
  return sanitizePlainText(value, 254).toLowerCase();
}
