import {
  AdminAttendanceStats,
  AttendanceDayStat,
  AttendanceRegionStat,
  CenterAttendanceStats,
} from '../types';
import { getClient } from './apiClient';

export async function getMyCenterAttendanceStats(): Promise<CenterAttendanceStats> {
  const client = await getClient();
  const { data } = await client.get<CenterAttendanceStats>('/api/auth/my-center/attendance/stats');
  return data;
}

export async function getAdminAttendanceStats(schoolId?: number): Promise<AdminAttendanceStats> {
  const client = await getClient();
  const { data } = await client.get<AdminAttendanceStats>('/api/dashboard/attendance-stats', {
    params: schoolId ? { schoolId } : undefined,
  });
  return data;
}

export type { AttendanceDayStat, AttendanceRegionStat };
