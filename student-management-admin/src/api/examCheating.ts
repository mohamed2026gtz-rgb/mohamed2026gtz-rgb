import { apiFetch } from './client';
import { DEFAULT_YEAR } from '../types';
import type {
  CheatingIncident,
  CheatingSeverity,
  CheatingStatus,
  CheatingType,
  PagedResult,
} from '../types';

export function getCheatingTypes() {
  return apiFetch<CheatingType[]>('/api/exam-cheating/types');
}

export function getCheatingIncidents(params?: {
  search?: string;
  region?: string;
  schoolLevel?: string;
  examDate?: string;
  subject?: string;
  status?: CheatingStatus;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set('search', params.search.trim());
  if (params?.region?.trim()) query.set('region', params.region.trim());
  if (params?.schoolLevel?.trim()) query.set('schoolLevel', params.schoolLevel.trim());
  if (params?.examDate?.trim()) query.set('examDate', params.examDate.trim());
  if (params?.subject?.trim()) query.set('subject', params.subject.trim());
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return apiFetch<PagedResult<CheatingIncident>>(`/api/exam-cheating/incidents${qs ? `?${qs}` : ''}`);
}

export function getCheatingIncident(id: number) {
  return apiFetch<CheatingIncident>(`/api/exam-cheating/incidents/${id}`);
}

export function createCheatingIncident(body: {
  studentNo: string;
  examDate: string;
  subject: string;
  incidentDescription: string;
  examShift?: number;
  cheatingTypeId?: number;
  customTypeLabel?: string;
  evidenceNotes?: string;
  invigilatorName?: string;
  invigilatorAction?: string;
  supervisorName?: string;
  supervisorAction?: string;
  actionTaken?: string;
  severity?: CheatingSeverity;
  status?: CheatingStatus;
  followUpNotes?: string;
  academicYear?: string;
}) {
  return apiFetch<CheatingIncident>('/api/exam-cheating/incidents', {
    method: 'POST',
    body: JSON.stringify({
      academicYear: DEFAULT_YEAR,
      ...body,
    }),
  });
}

export function updateCheatingIncident(
  id: number,
  body: Partial<{
    examDate: string;
    subject: string;
    examShift: number;
    cheatingTypeId: number;
    customTypeLabel: string;
    incidentDescription: string;
    evidenceNotes: string;
    invigilatorName: string;
    invigilatorAction: string;
    supervisorName: string;
    supervisorAction: string;
    actionTaken: string;
    severity: CheatingSeverity;
    status: CheatingStatus;
    followUpNotes: string;
  }>
) {
  return apiFetch<CheatingIncident>(`/api/exam-cheating/incidents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteCheatingIncident(id: number) {
  return apiFetch<void>(`/api/exam-cheating/incidents/${id}`, { method: 'DELETE' });
}