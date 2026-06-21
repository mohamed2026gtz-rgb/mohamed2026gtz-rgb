import {
  CreateStaffUserPayload,
  PagedResult,
  ScopeTypeOption,
  StaffUser,
} from '../types';
import { getClient } from './apiClient';

export async function getScopeTypeOptions(): Promise<ScopeTypeOption[]> {
  const client = await getClient();
  const { data } = await client.get<ScopeTypeOption[]>('/api/users/scope-types');
  return data;
}

export async function listStaffUsers(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResult<StaffUser>> {
  const client = await getClient();
  const { data } = await client.get<PagedResult<StaffUser>>('/api/users', { params });
  return data;
}

export async function getStaffUser(id: string): Promise<StaffUser> {
  const client = await getClient();
  const { data } = await client.get<StaffUser>(`/api/users/${id}`);
  return data;
}

export async function createStaffUser(payload: CreateStaffUserPayload): Promise<StaffUser> {
  const client = await getClient();
  const { data } = await client.post<StaffUser>('/api/users', payload);
  return data;
}

export async function updateStaffUser(
  id: string,
  payload: Partial<CreateStaffUserPayload> & { status?: string }
): Promise<StaffUser> {
  const client = await getClient();
  const { data } = await client.put<StaffUser>(`/api/users/${id}`, payload);
  return data;
}