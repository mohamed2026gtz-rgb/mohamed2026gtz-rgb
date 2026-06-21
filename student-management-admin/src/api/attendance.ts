import { apiFetch } from './client';
import type { ExamAttendanceRecord } from '../types';

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function recordKey(studentNo: string, subject: string, attendanceDate?: string): string {
  const subj = subject.trim().toLowerCase();
  const date = (attendanceDate || '').trim();
  return date ? `${studentNo}::${subj}::${date}` : `${studentNo}::${subj}`;
}

export async function lookupExamAttendance(
  subject: string,
  attendanceDate: string,
  studentNos: string[]
): Promise<ExamAttendanceRecord[]> {
  if (!studentNos.length) return [];

  const response = await apiFetch<{ items: ExamAttendanceRecord[] } | ExamAttendanceRecord[]>(
    '/api/attendance/lookup',
    {
      method: 'POST',
      body: JSON.stringify({ subject, attendanceDate, studentNos }),
    }
  );

  return Array.isArray(response) ? response : response.items ?? [];
}

export async function getExamAttendanceMapForSession(
  subject: string,
  attendanceDate: string,
  studentNos: string[]
): Promise<Map<string, ExamAttendanceRecord>> {
  const map = new Map<string, ExamAttendanceRecord>();
  if (!subject.trim() || !attendanceDate.trim() || !studentNos.length) return map;

  const items = await lookupExamAttendance(subject, attendanceDate, studentNos);
  for (const row of items) {
    map.set(row.studentNo, row);
  }
  return map;
}

export async function getExamAttendanceMap(
  subject: string,
  attendanceDate: string,
  studentNos: string[]
): Promise<Map<string, ExamAttendanceRecord>> {
  const map = new Map<string, ExamAttendanceRecord>();
  if (!subject.trim() || !attendanceDate.trim() || !studentNos.length) return map;

  const items = await lookupExamAttendance(subject, attendanceDate, studentNos);
  for (const row of items) {
    map.set(recordKey(row.studentNo, row.subject, row.attendanceDate), row);
  }
  return map;
}

export async function saveBulkExamAttendance(
  entries: Array<{ studentNo: string; present: boolean }>,
  subject: string,
  attendanceDate: string
): Promise<void> {
  const trimmedSubject = subject.trim();
  const trimmedDate = attendanceDate.trim();
  if (!trimmedSubject || !trimmedDate) {
    throw new Error('Subject and attendance date are required');
  }
  if (!entries.length) {
    throw new Error('No students to save');
  }

  await apiFetch<void>('/api/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify({
      subject: trimmedSubject,
      attendanceDate: trimmedDate,
      entries: entries.map((entry) => ({
        studentNo: entry.studentNo,
        present: entry.present,
      })),
    }),
  });
}