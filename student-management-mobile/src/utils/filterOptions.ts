import { FilterOption } from '../components/FilterChips';
import { ExamCenter, Region, School, Supervisor } from '../types';

export function buildRegionFilterOptions(regions: Region[]): FilterOption[] {
  return regions.map((r) => ({
    label: r.name || `Region ${r.auto}`,
    value: r.name || '',
    subtitle: r.reo ? `REO: ${r.reo}` : undefined,
  }));
}

/** Region picker that stores region_id (for staff user scope). */
export function buildRegionIdFilterOptions(regions: Region[]): FilterOption[] {
  return regions.map((r) => ({
    label: r.name || `Region ${r.auto}`,
    value: r.auto,
    subtitle: r.reo ? `REO: ${r.reo}` : undefined,
  }));
}

export function buildDistrictIdFilterOptions(
  districts: { auto: number; name?: string }[]
): FilterOption[] {
  return districts.map((d) => ({
    label: d.name || `District ${d.auto}`,
    value: d.auto,
  }));
}

export function buildLevelFilterOptions(levels: string[]): FilterOption[] {
  return [
    { label: 'All levels', value: null, subtitle: 'Primary, Secondary, TVET, and others' },
    ...levels.map((l) => ({
      label: l,
      value: l,
      subtitle: `Show only ${l} schools`,
    })),
  ];
}

/** School browse: user must pick a specific level before loading schools. */
export function buildSchoolLevelPickerOptions(levels: string[]): FilterOption[] {
  return levels.map((l) => ({
    label: l,
    value: l,
    subtitle: `Schools at ${l} level`,
  }));
}

export function buildSchoolFilterOptions(schools: School[]): FilterOption[] {
  return [
    {
      label: 'All schools',
      value: null,
      subtitle: 'Students from every school in the current scope',
    },
    ...schools.map((s) => ({
      label: s.schoolName || `School ${s.schoolId}`,
      value: s.schoolId,
      subtitle: [
        s.schoolNumber ? `School No. ${s.schoolNumber}` : null,
        s.schoolLevel || null,
        s.region || null,
        s.studentCount != null ? `${s.studentCount} students` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  ];
}

export function buildCenterSchoolFilterOptions(schools: School[]): FilterOption[] {
  return schools.map((s) => ({
    label: s.schoolName || `School ${s.schoolId}`,
    value: s.schoolId,
    subtitle: [
      s.schoolNumber ? `No. ${s.schoolNumber}` : null,
      s.studentCount != null ? `${s.studentCount} students` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
}

export function buildSupervisorFilterOptions(supervisors: Supervisor[]): FilterOption[] {
  return supervisors.map((s) => ({
    label: s.name,
    value: s.id,
    subtitle: [
      s.title || null,
      s.mobile ? `Mobile: ${s.mobile}` : null,
      s.currentInstitution || null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
}

export function buildExamCenterFilterOptions(centers: ExamCenter[]): FilterOption[] {
  return centers.map((c) => ({
    label: c.centerName,
    value: c.id,
    subtitle: [
      c.region || null,
      c.district || null,
      c.schoolCount != null ? `${c.schoolCount} schools` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
}
