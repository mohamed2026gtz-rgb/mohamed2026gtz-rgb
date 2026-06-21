import { apiFetch } from './client';
import type { ExamCenter, ExamCenterSummary, PagedResult, School, Student, SupervisorLevel } from '../types';

function levelPath(level: SupervisorLevel) {
  return level === 'primary' ? 'primary' : 'secondary';
}

export function getPrimaryExamCenters(params?: {
  search?: string;
  region?: string;
  academicYear?: string;
}) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set('search', params.search.trim());
  if (params?.region?.trim()) query.set('region', params.region.trim());
  if (params?.academicYear?.trim()) query.set('academicYear', params.academicYear.trim());
  const qs = query.toString();
  return apiFetch<ExamCenter[]>(`/api/exam-centers/primary${qs ? `?${qs}` : ''}`);
}

export function getSecondaryExamCenters(params?: {
  search?: string;
  region?: string;
  academicYear?: string;
}) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set('search', params.search.trim());
  if (params?.region?.trim()) query.set('region', params.region.trim());
  if (params?.academicYear?.trim()) query.set('academicYear', params.academicYear.trim());
  const qs = query.toString();
  return apiFetch<ExamCenter[]>(`/api/exam-centers/secondary${qs ? `?${qs}` : ''}`);
}

export function getExamCenterSummary(level: SupervisorLevel, centerId: number) {
  return apiFetch<ExamCenterSummary>(`/api/exam-centers/${levelPath(level)}/${centerId}/summary`);
}

export function getExamCenterSchools(level: SupervisorLevel, centerId: number, search?: string) {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  const qs = query.toString();
  return apiFetch<School[]>(
    `/api/exam-centers/${levelPath(level)}/${centerId}/schools${qs ? `?${qs}` : ''}`
  );
}

export function getExamCenterStudents(
  level: SupervisorLevel,
  centerId: number,
  params?: { page?: number; pageSize?: number; search?: string }
) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.search?.trim()) query.set('search', params.search.trim());
  const qs = query.toString();
  return apiFetch<PagedResult<Student>>(
    `/api/exam-centers/${levelPath(level)}/${centerId}/students${qs ? `?${qs}` : ''}`
  );
}

export function syncPrimaryExamCenters() {
  return apiFetch<{ message: string; inserted?: number; updated?: number }>(
    '/api/exam-centers/primary/sync',
    { method: 'POST' }
  );
}