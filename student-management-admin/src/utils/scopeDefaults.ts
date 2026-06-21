import { getSchool, getSchools } from '../api/catalog';
import type { Region, School, UserAccessScope, UserProfile } from '../types';
import { isFullAdmin, isScopedStaff } from './roles';

export interface ScopeFilterDefaults {
  regionId: number | null;
  regionName: string | null;
  level: string | null;
  schoolId: number | null;
  lockRegion: boolean;
  lockLevel: boolean;
  lockSchool: boolean;
  allowAllRegions: boolean;
  scopeLabel: string | null;
  autoLoadStudents: boolean;
}

const EMPTY_DEFAULTS: ScopeFilterDefaults = {
  regionId: null,
  regionName: null,
  level: null,
  schoolId: null,
  lockRegion: false,
  lockLevel: false,
  lockSchool: false,
  allowAllRegions: true,
  scopeLabel: null,
  autoLoadStudents: false,
};

function getRegionNameById(regions: Region[], regionId?: number | null): string | null {
  if (regionId == null) return null;
  const asNumber = Number(regionId);
  if (!Number.isFinite(asNumber)) return null;
  return regions.find((region) => Number(region.auto) === asNumber)?.name || null;
}

function scopeTypeLabel(scopeType: UserAccessScope['scopeType']): string {
  switch (scopeType) {
    case 'region':
      return 'Region';
    case 'district':
      return 'District';
    case 'school_level':
      return 'School level';
    case 'school':
      return 'School';
    default:
      return 'Scope';
  }
}

export function resolveScopeFilterDefaults(
  user: UserProfile | null | undefined,
  regions: Region[]
): ScopeFilterDefaults {
  if (!user || isFullAdmin(user) || !isScopedStaff(user)) {
    return { ...EMPTY_DEFAULTS };
  }

  const scope = user.accessScope;
  if (!scope?.scopeType) return { ...EMPTY_DEFAULTS };

  const regionId = scope.regionId != null ? Number(scope.regionId) : null;
  const regionName = getRegionNameById(regions, regionId);
  const label = scopeTypeLabel(scope.scopeType);
  const schoolCount = scope.schoolCount ?? scope.schoolIds?.length ?? 0;

  switch (scope.scopeType) {
    case 'region':
      return {
        ...EMPTY_DEFAULTS,
        regionId,
        regionName,
        lockRegion: Boolean(regionId),
        allowAllRegions: false,
        scopeLabel: regionName ? `${label}: ${regionName}` : `${label} access`,
      };
    case 'district':
      return {
        ...EMPTY_DEFAULTS,
        regionId,
        regionName,
        lockRegion: Boolean(regionId),
        allowAllRegions: false,
        scopeLabel: regionName ? `${label} (${regionName})` : `${label} access`,
      };
    case 'school_level':
      return {
        ...EMPTY_DEFAULTS,
        regionId,
        regionName,
        level: scope.schoolLevel || null,
        lockRegion: Boolean(regionId),
        lockLevel: Boolean(scope.schoolLevel),
        allowAllRegions: false,
        scopeLabel: [label, regionName, scope.schoolLevel].filter(Boolean).join(' - '),
      };
    case 'school': {
      const singleSchool = scope.schoolIds?.length === 1 ? Number(scope.schoolIds[0]) : null;
      return {
        ...EMPTY_DEFAULTS,
        regionId,
        regionName,
        level: scope.schoolLevel || null,
        schoolId: singleSchool,
        lockRegion: Boolean(regionId),
        lockLevel: Boolean(scope.schoolLevel),
        lockSchool: Boolean(singleSchool),
        allowAllRegions: false,
        scopeLabel: `${label} access (${schoolCount} school${schoolCount === 1 ? '' : 's'})`,
        autoLoadStudents: Boolean(singleSchool),
      };
    }
    default:
      return { ...EMPTY_DEFAULTS };
  }
}

export async function resolveScopeFiltersAsync(
  user: UserProfile | null | undefined,
  regions: Region[]
): Promise<ScopeFilterDefaults> {
  let defaults = resolveScopeFilterDefaults(user, regions);
  const scope = user?.accessScope;

  if (!scope?.scopeType) return defaults;

  if ((!defaults.regionName || defaults.regionId == null) && scope.schoolIds?.length) {
    try {
      const school = await getSchool(Number(scope.schoolIds[0]));
      defaults = {
        ...defaults,
        regionId: defaults.regionId ?? (school.regionId != null ? Number(school.regionId) : null),
        regionName: school.region || defaults.regionName,
        level: defaults.level || school.schoolLevel || null,
      };
    } catch {
      // Optional enrichment.
    }
  }

  return defaults;
}

export function canGenerateStudentList(
  user: UserProfile | null | undefined,
  regionName: string | null,
  regionId: number | null,
  schoolId: number | null
): boolean {
  if (schoolId) return true;
  if (regionId || regionName) return true;
  return isScopedStaff(user) && !isFullAdmin(user);
}

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
  return schools.filter((school) => normalizeSchoolLevel(school.schoolLevel) === target);
}

export async function loadAccessibleSchools(
  user: UserProfile | null | undefined,
  filters: AccessibleSchoolFilters = {}
): Promise<School[]> {
  const scope = user?.accessScope;
  const scoped = isScopedStaff(user) && !isFullAdmin(user);
  const requestedLevel = filters.level?.trim() || null;
  const search = filters.search?.trim() || undefined;

  if (scoped && scope?.scopeType === 'school') {
    let rows = await getSchools({ search });
    if (scope.schoolIds?.length) {
      const allowed = new Set(scope.schoolIds.map((id) => Number(id)));
      rows = rows.filter((school) => allowed.has(Number(school.schoolId)));
    }
    if (!rows.length && scope.schoolIds?.length) {
      const fetched = await Promise.all(
        scope.schoolIds.map((id) => getSchool(Number(id)).catch(() => null))
      );
      rows = fetched.filter((school): school is School => school != null);
    }
    if (requestedLevel) rows = filterSchoolsByLevel(rows, requestedLevel);
    if (search) {
      const query = search.toLowerCase();
      rows = rows.filter(
        (school) =>
          school.schoolName?.toLowerCase().includes(query) ||
          school.schoolNumber?.toLowerCase().includes(query)
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
    const rows = await getSchools(baseParams);
    return requestedLevel ? filterSchoolsByLevel(rows, requestedLevel) : rows;
  }

  return getSchools({
    ...baseParams,
    level: requestedLevel || undefined,
  });
}