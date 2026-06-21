import { DashboardStats } from '../types';
import { getClient } from './apiClient';

export async function getDashboardStats(schoolId?: number): Promise<DashboardStats> {
  const client = await getClient();
  const { data } = await client.get<DashboardStats>('/api/dashboard/stats', {
    params: schoolId ? { schoolId } : undefined,
  });
  return data;
}
