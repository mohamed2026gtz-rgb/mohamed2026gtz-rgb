import {
  CheatingIncident,
  CheatingSeverity,
  CheatingStatus,
  CheatingType,
  PagedResult,
} from '../types';
import { getClient } from './apiClient';

export async function getCheatingTypes(): Promise<CheatingType[]> {
  const client = await getClient();
  const { data } = await client.get<CheatingType[]>('/api/exam-cheating/types');
  return data;
}

export async function createCheatingType(body: {
  code: string;
  label: string;
  description?: string;
}): Promise<CheatingType> {
  const client = await getClient();
  const { data } = await client.post<CheatingType>('/api/exam-cheating/types', body);
  return data;
}

export async function getCheatingIncidents(params?: {
  search?: string;
  region?: string;
  schoolLevel?: string;
  examDate?: string;
  subject?: string;
  status?: CheatingStatus;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<CheatingIncident>> {
  const client = await getClient();
  const { data } = await client.get<PagedResult<CheatingIncident>>('/api/exam-cheating/incidents', {
    params,
  });
  return data;
}

export async function getCheatingIncident(id: number): Promise<CheatingIncident> {
  const client = await getClient();
  const { data } = await client.get<CheatingIncident>(`/api/exam-cheating/incidents/${id}`);
  return data;
}

export async function createCheatingIncident(body: {
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
}): Promise<CheatingIncident> {
  const client = await getClient();
  const { data } = await client.post<CheatingIncident>('/api/exam-cheating/incidents', {
    academicYear: '2025/2026',
    ...body,
  });
  return data;
}

export async function updateCheatingIncident(
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
): Promise<CheatingIncident> {
  const client = await getClient();
  const { data } = await client.put<CheatingIncident>(`/api/exam-cheating/incidents/${id}`, body);
  return data;
}

export async function deleteCheatingIncident(id: number): Promise<void> {
  const client = await getClient();
  await client.delete(`/api/exam-cheating/incidents/${id}`);
}
