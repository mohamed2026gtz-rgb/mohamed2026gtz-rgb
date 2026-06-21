import { apiFetch } from './client';
import { fetchAuthedBlob } from '../utils/photos';
import type { PagedResult, Student, StudentTranscript } from '../types';

export function getStudents(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  classId?: string;
  schoolId?: number;
  region?: string;
  regionId?: number;
  level?: string;
  searchAllSchools?: boolean;
}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 20));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.classId?.trim()) query.set('classId', params.classId.trim());
  if (params.schoolId) query.set('schoolId', String(params.schoolId));
  if (params.region?.trim()) query.set('region', params.region.trim());
  if (params.regionId) query.set('regionId', String(params.regionId));
  if (params.level?.trim()) query.set('level', params.level.trim());
  if (params.searchAllSchools) query.set('searchAllSchools', 'true');

  return apiFetch<PagedResult<Student>>(`/api/students?${query.toString()}`);
}

export function getStudent(studentNo: string) {
  return apiFetch<Student>(`/api/students/${encodeURIComponent(studentNo)}`);
}

export function getTranscript(studentNo: string) {
  return apiFetch<StudentTranscript>(`/api/students/${encodeURIComponent(studentNo)}/transcript`);
}

export function getStudentPhotoBlob(studentNo: string) {
  return fetchAuthedBlob(`/api/students/${encodeURIComponent(studentNo)}/photo`);
}