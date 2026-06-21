import { apiFetch, apiUpload, getApiBaseUrl, getToken } from './client';
import type { Supervisor, SupervisorAssignment, SupervisorLevel } from '../types';

export interface SupervisorInput {
  name: string;
  sex?: string | null;
  mobile?: string | null;
  yearOfBirth?: string | null;
  residency?: string | null;
  region?: string | null;
  email?: string | null;
  currentInstitution?: string | null;
  title?: string | null;
  experienceForSupervision?: string | null;
  initialPassword?: string;
}

function base(level: SupervisorLevel) {
  return `/api/supervisors/${level}`;
}

export function getSupervisors(level: SupervisorLevel, search?: string) {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  const qs = query.toString();
  return apiFetch<Supervisor[]>(`${base(level)}${qs ? `?${qs}` : ''}`);
}

export function getSupervisor(level: SupervisorLevel, id: number) {
  return apiFetch<Supervisor>(`${base(level)}/${id}`);
}

export function createSupervisor(level: SupervisorLevel, body: SupervisorInput, photo?: File) {
  if (photo) {
    const formData = new FormData();
    formData.append('photo', photo);
    if (body.name) formData.append('name', body.name);
    if (body.sex) formData.append('sex', body.sex);
    if (body.mobile) formData.append('mobile', body.mobile);
    if (body.yearOfBirth) formData.append('yearOfBirth', body.yearOfBirth);
    if (body.residency) formData.append('residency', body.residency);
    if (body.region) formData.append('region', body.region);
    if (body.email) formData.append('email', body.email);
    if (body.currentInstitution) formData.append('currentInstitution', body.currentInstitution);
    if (body.title) formData.append('title', body.title);
    if (body.experienceForSupervision) {
      formData.append('experienceForSupervision', body.experienceForSupervision);
    }
    if (body.initialPassword) formData.append('initialPassword', body.initialPassword);
    return apiUpload<Supervisor & { loginAccountCreated?: boolean; message?: string }>(
      base(level),
      formData
    );
  }

  return apiFetch<Supervisor & { loginAccountCreated?: boolean; message?: string }>(base(level), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateSupervisor(level: SupervisorLevel, id: number, body: SupervisorInput) {
  return apiFetch<Supervisor>(`${base(level)}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteSupervisor(level: SupervisorLevel, id: number) {
  return apiFetch<void>(`${base(level)}/${id}`, { method: 'DELETE' });
}

export function getAssignments(
  level: SupervisorLevel,
  params?: { supervisorId?: number; centerId?: number; academicYear?: string }
) {
  const query = new URLSearchParams();
  if (params?.supervisorId) query.set('supervisorId', String(params.supervisorId));
  if (params?.centerId) query.set('centerId', String(params.centerId));
  if (params?.academicYear?.trim()) query.set('academicYear', params.academicYear.trim());
  const qs = query.toString();
  return apiFetch<SupervisorAssignment[]>(`${base(level)}/assignments/list${qs ? `?${qs}` : ''}`);
}

export function assignSupervisor(
  level: SupervisorLevel,
  body: {
    supervisorId: number;
    centerId: number;
    academicYear?: string;
    notes?: string;
  }
) {
  return apiFetch<{ id: number; message: string }>(`${base(level)}/assignments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function removeAssignment(level: SupervisorLevel, id: number) {
  return apiFetch<void>(`${base(level)}/assignments/${id}`, { method: 'DELETE' });
}

export function uploadSupervisorPhoto(level: SupervisorLevel, id: number, file: File) {
  const formData = new FormData();
  formData.append('photo', file);
  return apiUpload<Supervisor>(`${base(level)}/${id}/photo`, formData);
}

export async function fetchSupervisorPhotoObjectUrl(
  level: SupervisorLevel,
  id: number
): Promise<string | null> {
  const baseUrl = getApiBaseUrl();
  const token = getToken();
  if (!token) return null;

  const url = `${baseUrl}/api/supervisors/${level}/${id}/photo`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export interface ImportRowError {
  row: number | null;
  message: string;
}

export interface SupervisorImportResult {
  created: number;
  skipped: number;
  loginAccountsCreated?: number;
  photosAttached?: number;
  photoWarnings?: ImportRowError[];
  errors: ImportRowError[];
  totalRows: number;
  message: string;
}

export interface AssignmentImportResult {
  created: number;
  skipped: number;
  errors: ImportRowError[];
  totalRows: number;
  message: string;
}

export function importSupervisorsFromFile(
  level: SupervisorLevel,
  file: File,
  options?: { createLogins?: boolean }
) {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.createLogins) formData.append('createLogins', 'true');
  return apiUpload<SupervisorImportResult>(`${base(level)}/import`, formData);
}

export function importSupervisorsWithPhotosFromFiles(
  level: SupervisorLevel,
  csvFile: File,
  photosZip: File,
  options?: { createLogins?: boolean }
) {
  const formData = new FormData();
  formData.append('file', csvFile);
  formData.append('photos', photosZip);
  if (options?.createLogins) formData.append('createLogins', 'true');
  return apiUpload<SupervisorImportResult>(`${base(level)}/import-with-photos`, formData);
}

export function importAssignmentsFromFile(level: SupervisorLevel, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<AssignmentImportResult>(`${base(level)}/assignments/import`, formData);
}