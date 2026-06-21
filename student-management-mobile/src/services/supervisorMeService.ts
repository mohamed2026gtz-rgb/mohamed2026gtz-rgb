import * as FileSystem from 'expo-file-system/legacy';
import { ExamCenterSummary, PagedResult, School, Student, SupervisorAssignment } from '../types';
import { getApiBaseUrl, getClient, getToken } from './apiClient';

export type SupervisorStudentProfile = Student & {
  examCenterName?: string;
  examCenterLevel?: string;
  academicYear?: string;
};

export async function getMySupervisorAssignment(): Promise<SupervisorAssignment> {
  const client = await getClient();
  const { data } = await client.get<SupervisorAssignment>('/api/auth/my-supervisor-assignment');
  return data;
}

export async function getMyCenterSummary(): Promise<
  ExamCenterSummary & { assignment: SupervisorAssignment }
> {
  const client = await getClient();
  const { data } = await client.get('/api/auth/my-center/summary');
  return data;
}

export async function getMyCenterSchools(search?: string): Promise<School[]> {
  const client = await getClient();
  const { data } = await client.get<School[]>('/api/auth/my-center/schools', {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function getMyCenterStudents(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: number;
}): Promise<PagedResult<Student>> {
  const client = await getClient();
  const { data } = await client.get<PagedResult<Student>>('/api/auth/my-center/students', {
    params,
  });
  return data;
}

export async function lookupMyCenterStudent(query: string): Promise<SupervisorStudentProfile> {
  const client = await getClient();
  const { data } = await client.get<SupervisorStudentProfile>(
    '/api/auth/my-center/students/lookup',
    { params: { q: query.trim() } }
  );
  return data;
}

export async function downloadMyCenterStudentPhotoUri(studentNo: string): Promise<string> {
  const base = await getApiBaseUrl();
  const token = await getToken();
  const url = `${base}/api/auth/my-center/students/${encodeURIComponent(studentNo)}/photo`;
  const safeId = studentNo.replace(/[^a-zA-Z0-9-]/g, '_');
  const dest = `${FileSystem.cacheDirectory}supervisor-student-photo-${safeId}.jpg`;

  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  const result = await FileSystem.downloadAsync(url, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) {
    throw new Error('Could not download student photo');
  }
  return result.uri;
}
