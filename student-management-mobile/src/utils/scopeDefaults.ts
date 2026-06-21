import { Region, UserAccessScope, UserProfile, isFullAdmin, isScopedStaff } from '../types';
import { getSchool } from '../services/schoolService';

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

const EMPTY: ScopeFilterDefaults = {
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

function regionNameFromId(regions: Region[], regionId?: number | null): string | null {
  if (regionId == null) return null;
  const id = Number(regionId);
  if (!Number.isFinite(id)) return null;
  return regions.find((r) => Number(r.auto) === id)?.name || null;
}

function scopeTypeLabel(scopeType: UserAccessScope['scopeType']): string {
  switch (scopeType) {
    case 'region':
      return 'Region';
    case 'district':
      return 'District';
    case 'school_level':
      return 'Center';
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
  if (!user || isFullAdmin(user)) return { ...EMPTY };

  const scope = user.accessScope;
  if (!scope?.scopeType) return { ...EMPTY };

  const regionId = scope.regionId != null ? Number(scope.regionId) : null;
  const regionName = scope.regionName || regionNameFromId(regions, regionId);
  const districtName = scope.districtName || null;
  const baseLabel = scopeTypeLabel(scope.scopeType);
  const schoolCount = scope.schoolCount ?? scope.schoolIds?.length ?? 0;

  switch (scope.scopeType) {
    case 'region':
      return {
        ...EMPTY,
        regionId,
        regionName,
        lockRegion: Boolean(regionId),
        allowAllRegions: false,
        scopeLabel: regionName ? `${baseLabel}: ${regionName}` : `${baseLabel} access`,
      };
    case 'district':
      return {
        ...EMPTY,
        regionId,
        regionName,
        lockRegion: Boolean(regionId),
        allowAllRegions: false,
        scopeLabel: [baseLabel, districtName || regionName].filter(Boolean).join(' · ') || `${baseLabel} access`,
      };
    case 'school_level':
      return {
        ...EMPTY,
        regionId,
        regionName,
        level: scope.schoolLevel || null,
        lockRegion: Boolean(regionId),
        lockLevel: Boolean(scope.schoolLevel),
        allowAllRegions: false,
        scopeLabel: [baseLabel, regionName, scope.schoolLevel].filter(Boolean).join(' · '),
      };
    case 'school': {
      const singleSchool = scope.schoolIds?.length === 1 ? scope.schoolIds[0] : null;
      return {
        ...EMPTY,
        regionId,
        regionName,
        level: scope.schoolLevel || null,
        schoolId: singleSchool,
        lockRegion: Boolean(regionId),
        lockLevel: Boolean(scope.schoolLevel),
        lockSchool: Boolean(singleSchool),
        allowAllRegions: false,
        scopeLabel: `${baseLabel} access (${schoolCount} school${schoolCount === 1 ? '' : 's'})`,
        autoLoadStudents: Boolean(singleSchool),
      };
    }
    default:
      return { ...EMPTY };
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
      const school = await getSchool(scope.schoolIds[0]);
      defaults = {
        ...defaults,
        regionId: defaults.regionId ?? (school.regionId != null ? Number(school.regionId) : null),
        regionName: school.region || defaults.regionName,
        level: defaults.level || school.schoolLevel || null,
      };
    } catch {
      // Optional enrichment only.
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
  if (user?.accessScope?.scopeType) return true;
  return isScopedStaff(user) && !isFullAdmin(user);
}