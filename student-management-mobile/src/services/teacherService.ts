import { PagedResult, Teacher } from '../types';
import { getClient } from './apiClient';

export async function getTeachers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: number;
}): Promise<PagedResult<Teacher>> {
  const client = await getClient();
  const { data } = await client.get<PagedResult<Teacher>>('/api/teachers', {
    params,
  });
  return data;
}
