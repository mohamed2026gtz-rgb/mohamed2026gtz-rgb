import { apiFetch } from './client';
import type { District, Region, School } from '../types';

export function getRegions(search?: string) {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  const qs = query.toString();
  return apiFetch<Region[]>(`/api/regions${qs ? `?${qs}` : ''}`);
}

export function getDistricts(regionId: number, search?: string) {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  const qs = query.toString();
  return apiFetch<District[]>(`/api/regions/${regionId}/districts${qs ? `?${qs}` : ''}`);
}

export function getSchoolLevels() {
  return apiFetch<string[]>('/api/schools/levels');
}

export function getSchools(params: {
  search?: string;
  region?: string;
  regionId?: number;
  level?: string;
}) {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.region?.trim()) query.set('region', params.region.trim());
  if (params.regionId) query.set('regionId', String(params.regionId));
  if (params.level?.trim()) query.set('level', params.level.trim());
  const qs = query.toString();
  return apiFetch<School[]>(`/api/schools${qs ? `?${qs}` : ''}`);
}

export function getSchool(schoolId: number) {
  return apiFetch<School>(`/api/schools/${schoolId}`);
}