import { apiFetch } from './client';
import type { PagedResult, Teacher } from '../types';

export function getTeachers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: number;
}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 50));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.schoolId) query.set('schoolId', String(params.schoolId));
  const qs = query.toString();
  return apiFetch<PagedResult<Teacher>>(`/api/teachers${qs ? `?${qs}` : ''}`);
}