export function catalogLevelFromCenter(level?: string | null): 'Primary' | 'Secondary' {
  if (level?.toLowerCase().includes('primary')) return 'Primary';
  return 'Secondary';
}
