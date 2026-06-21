import { apiFetch } from './client';
import type { AdminAttendanceStats, DashboardStats } from '../types';

export function getDashboardStats(schoolId?: number) {
  const query = new URLSearchParams();
  if (schoolId) query.set('schoolId', String(schoolId));
  const qs = query.toString();
  return apiFetch<DashboardStats>(`/api/dashboard/stats${qs ? `?${qs}` : ''}`);
}

export function getDashboardAttendanceStats(schoolId?: number) {
  const query = new URLSearchParams();
  if (schoolId) query.set('schoolId', String(schoolId));
  const qs = query.toString();
  return apiFetch<AdminAttendanceStats>(`/api/dashboard/attendance-stats${qs ? `?${qs}` : ''}`);
}