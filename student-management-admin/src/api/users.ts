import { apiFetch } from './client';
import type {
  CreateStaffUserPayload,
  PagedResult,
  ScopeTypeOption,
  StaffUser,
} from '../types';

export function getScopeTypes() {
  return apiFetch<ScopeTypeOption[]>('/api/users/scope-types');
}

export function listStaffUsers(params: { page?: number; pageSize?: number; search?: string }) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) query.set('search', params.search.trim());
  const qs = query.toString();
  return apiFetch<PagedResult<StaffUser>>(`/api/users${qs ? `?${qs}` : ''}`);
}

export function getStaffUser(id: string) {
  return apiFetch<StaffUser>(`/api/users/${id}`);
}

export function createStaffUser(payload: CreateStaffUserPayload & { password: string }) {
  return apiFetch<StaffUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStaffUser(id: string, payload: Partial<CreateStaffUserPayload>) {
  return apiFetch<StaffUser>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}