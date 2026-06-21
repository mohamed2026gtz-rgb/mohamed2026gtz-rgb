import * as FileSystem from 'expo-file-system/legacy';
import { PagedResult, Student, StudentTranscript } from '../types';
import { getApiBaseUrl, getClient, getToken } from './apiClient';

export async function getStudents(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  classId?: string;
  schoolId?: number;
  region?: string;
  regionId?: number;
  level?: string;
  searchAllSchools?: boolean;
}): Promise<PagedResult<Student>> {
  const client = await getClient();
  const { data } = await client.get<PagedResult<Student>>('/api/students', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search,
      classId: params.classId,
      schoolId: params.schoolId,
      region: params.region,
      regionId: params.regionId,
      level: params.level,
      searchAllSchools: params.searchAllSchools ? 'true' : undefined,
    },
  });
  return data;
}

export async function getStudent(studentNo: string): Promise<Student> {
  const client = await getClient();
  const { data } = await client.get<Student>(`/api/students/${encodeURIComponent(studentNo)}`);
  return data;
}

export async function getTranscript(studentNo: string): Promise<StudentTranscript> {
  const client = await getClient();
  const { data } = await client.get<StudentTranscript>(
    `/api/students/${encodeURIComponent(studentNo)}/transcript`
  );
  return data;
}

/** Download student photo with JWT auth (works on Android; Image headers alone do not). */
export async function downloadStudentPhotoUri(studentNo: string): Promise<string> {
  const base = await getApiBaseUrl();
  const token = await getToken();
  const url = `${base}/api/students/${encodeURIComponent(studentNo)}/photo`;
  const safeId = studentNo.replace(/[^a-zA-Z0-9-]/g, '_');
  const dest = `${FileSystem.cacheDirectory}student-photo-${safeId}.jpg`;

  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  const result = await FileSystem.downloadAsync(url, dest, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(base.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {}),
    },
  });

  if (result.status !== 200) {
    throw new Error(`Photo download failed (${result.status})`);
  }

  return result.uri;
}
