import { School, UserProfile, isFullAdmin, isScopedStaff } from '../types';
import { getSchool, getSchools } from './schoolService';

export interface AccessibleSchoolFilters {
  regionId?: number | null;
  region?: string | null;
  level?: string | null;
  search?: string;
}

export function normalizeSchoolLevel(level?: string | null): string {
  const trimmed = (level || '').trim();
  return trimmed || 'Unspecified';
}

export function filterSchoolsByLevel(schools: School[], level: string | null | undefined): School[] {
  if (!level) return schools;
  const target = normalizeSchoolLevel(level);
  return schools.filter((s) => normalizeSchoolLevel(s.schoolLevel) === target);
}

export async function loadAccessibleSchools(
  user: UserProfile | null | undefined,
  filters: AccessibleSchoolFilters = {}
): Promise<School[]> {
  const scope = user?.accessScope;
  const scoped = Boolean(scope?.scopeType) && !isFullAdmin(user);
  const requestedLevel = filters.level?.trim() || null;
  const search = filters.search?.trim() || undefined;

  if (scoped && scope?.scopeType === 'school') {
    let rows = await getSchools({ search });
    if (scope.schoolIds?.length) {
      const allowed = new Set(scope.schoolIds.map((id) => Number(id)));
      rows = rows.filter((s) => allowed.has(Number(s.schoolId)));
    }
    if (!rows.length && scope.schoolIds?.length) {
      const fetched = await Promise.all(
        scope.schoolIds.map((id) => getSchool(Number(id)).catch(() => null))
      );
      rows = fetched.filter((s): s is School => s != null);
    }
    if (requestedLevel) rows = filterSchoolsByLevel(rows, requestedLevel);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.schoolName?.toLowerCase().includes(q) ||
          s.schoolNumber?.toLowerCase().includes(q)
      );
    }
    return rows;
  }

  const baseParams = {
    regionId: filters.regionId ?? undefined,
    region: !filters.regionId ? filters.region || undefined : undefined,
    search,
  };

  if (scoped && scope?.scopeType !== 'school') {
    const rows = await getSchools({
      ...baseParams,
      level: requestedLevel || undefined,
    });
    return rows;
  }

  return getSchools({
    ...baseParams,
    level: requestedLevel || undefined,
  });
}