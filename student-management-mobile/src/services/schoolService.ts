import { School } from '../types';
import { getClient } from './apiClient';

export async function getSchools(params?: {
  search?: string;
  region?: string;
  regionId?: number;
  level?: string;
}): Promise<School[]> {
  const client = await getClient();
  const { data } = await client.get<School[]>('/api/schools', { params });
  return data;
}

export async function getSchoolLevels(): Promise<string[]> {
  const client = await getClient();
  const { data } = await client.get<string[]>('/api/schools/levels');
  return data;
}

export async function getSchool(schoolId: number): Promise<School> {
  const client = await getClient();
  const { data } = await client.get<School>(`/api/schools/${schoolId}`);
  return data;
}
