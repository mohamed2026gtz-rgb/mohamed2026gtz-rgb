export function normalizeSexValue(value?: string | null): '' | 'Male' | 'Female' {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'm' || normalized === 'male') return 'Male';
  if (normalized === 'f' || normalized === 'female') return 'Female';
  return '';
}

export function sexBadgeClass(sex?: string | null): string {
  const value = normalizeSexValue(sex);
  if (value === 'Male') return 'supervisor-sex-badge supervisor-sex-badge--male';
  if (value === 'Female') return 'supervisor-sex-badge supervisor-sex-badge--female';
  return 'supervisor-sex-badge';
}
