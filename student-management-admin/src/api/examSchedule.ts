import { apiFetch } from './client';
import {
  DEFAULT_YEAR,
  type ExamLevelInfo,
  type ExamSubject,
  type ExamTimetableEntry,
} from '../types';

export function getExamCatalogLevels() {
  return apiFetch<ExamLevelInfo[]>('/api/exam-schedule/levels');
}

export function getExamSubjects(params?: {
  level?: string;
  academicYear?: string;
}) {
  const query = new URLSearchParams();
  if (params?.level?.trim()) query.set('level', params.level.trim());
  query.set('academicYear', params?.academicYear || DEFAULT_YEAR);
  return apiFetch<ExamSubject[]>(`/api/exam-schedule/subjects?${query.toString()}`);
}

export function createExamSubject(body: {
  schoolLevel: string;
  subjectName: string;
  subjectCode?: string;
  paperLabel?: string;
  academicYear?: string;
  sortOrder?: number;
}) {
  return apiFetch<ExamSubject>('/api/exam-schedule/subjects', {
    method: 'POST',
    body: JSON.stringify({
      academicYear: DEFAULT_YEAR,
      ...body,
    }),
  });
}

export function updateExamSubject(
  id: number,
  body: Partial<{
    subjectName: string;
    subjectCode: string;
    paperLabel: string;
    sortOrder: number;
    isActive: boolean;
  }>
) {
  return apiFetch<ExamSubject>(`/api/exam-schedule/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteExamSubject(id: number) {
  return apiFetch<void>(`/api/exam-schedule/subjects/${id}`, { method: 'DELETE' });
}

export function getExamTimetable(params?: {
  level?: string;
  academicYear?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = new URLSearchParams();
  if (params?.level?.trim()) query.set('level', params.level.trim());
  query.set('academicYear', params?.academicYear || DEFAULT_YEAR);
  if (params?.fromDate?.trim()) query.set('fromDate', params.fromDate.trim());
  if (params?.toDate?.trim()) query.set('toDate', params.toDate.trim());
  return apiFetch<ExamTimetableEntry[]>(`/api/exam-schedule/timetable?${query.toString()}`);
}

export function getExamSessionsForAttendance(
  level: string,
  examDate: string,
  academicYear = DEFAULT_YEAR
) {
  const query = new URLSearchParams({
    level,
    examDate,
    academicYear,
  });
  return apiFetch<ExamTimetableEntry[]>(`/api/exam-schedule/timetable/for-attendance?${query.toString()}`);
}

export function createExamTimetableEntry(body: {
  schoolLevel: string;
  examDate: string;
  examShift: number;
  subjectId: number;
  academicYear?: string;
  notes?: string;
}) {
  return apiFetch<ExamTimetableEntry>('/api/exam-schedule/timetable', {
    method: 'POST',
    body: JSON.stringify({
      academicYear: DEFAULT_YEAR,
      ...body,
    }),
  });
}

export function updateExamTimetableEntry(
  id: number,
  body: Partial<{
    examDate: string;
    examShift: number;
    subjectId: number;
    notes: string;
  }>
) {
  return apiFetch<ExamTimetableEntry>(`/api/exam-schedule/timetable/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteExamTimetableEntry(id: number) {
  return apiFetch<void>(`/api/exam-schedule/timetable/${id}`, { method: 'DELETE' });
}

export function sessionSubjectLabel(session: ExamTimetableEntry): string {
  return session.attendanceSubject || session.displayLabel || session.subjectName;
}