import { ExamCenter, ExamCenterSummary, PagedResult, School, Student, SupervisorLevel } from '../types';
import { getClient } from './apiClient';

function levelPath(level: SupervisorLevel) {
  return level === 'primary' ? 'primary' : 'secondary';
}

export async function getPrimaryExamCenters(params?: {
  search?: string;
  region?: string;
  academicYear?: string;
}): Promise<ExamCenter[]> {
  const client = await getClient();
  const { data } = await client.get<ExamCenter[]>('/api/exam-centers/primary', { params });
  return data;
}

export async function getSecondaryExamCenters(params?: {
  search?: string;
  region?: string;
  academicYear?: string;
}): Promise<ExamCenter[]> {
  const client = await getClient();
  const { data } = await client.get<ExamCenter[]>('/api/exam-centers/secondary', { params });
  return data;
}

export async function getExamCenterSummary(
  level: SupervisorLevel,
  centerId: number
): Promise<ExamCenterSummary> {
  const client = await getClient();
  const { data } = await client.get<ExamCenterSummary>(
    `/api/exam-centers/${levelPath(level)}/${centerId}/summary`
  );
  return data;
}

export async function getExamCenterSchools(
  level: SupervisorLevel,
  centerId: number,
  search?: string
): Promise<School[]> {
  const client = await getClient();
  const { data } = await client.get<School[]>(
    `/api/exam-centers/${levelPath(level)}/${centerId}/schools`,
    { params: search ? { search } : undefined }
  );
  return data;
}

export async function getExamCenterStudents(
  level: SupervisorLevel,
  centerId: number,
  params?: { page?: number; pageSize?: number; search?: string }
): Promise<PagedResult<Student>> {
  const client = await getClient();
  const { data } = await client.get<PagedResult<Student>>(
    `/api/exam-centers/${levelPath(level)}/${centerId}/students`,
    { params }
  );
  return data;
}
