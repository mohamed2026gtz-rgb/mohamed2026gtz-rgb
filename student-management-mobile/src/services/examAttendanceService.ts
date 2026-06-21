import { ExamAttendanceRecord } from '../types';
import { getClient } from './apiClient';

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
  const client = await getClient();
  const { data } = await client.post<{ items: ExamAttendanceRecord[] }>(
    '/api/attendance/lookup',
    { subject, attendanceDate, studentNos }
  );
  return data.items;
}

export async function getExamAttendanceMapForSession(
  subject: string,
  attendanceDate: string,
  studentNos?: string[]
): Promise<Map<string, ExamAttendanceRecord>> {
  const map = new Map<string, ExamAttendanceRecord>();
  if (!subject.trim() || !attendanceDate.trim()) return map;

  const nos = studentNos || [];
  if (!nos.length) return map;

  const items = await lookupExamAttendance(subject, attendanceDate, nos);
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
  const items = await lookupExamAttendance(subject, attendanceDate, studentNos);
  for (const row of items) {
    map.set(recordKey(row.studentNo, row.subject, row.attendanceDate), row);
  }
  return map;
}

export async function getLatestAttendanceForStudent(
  studentNo: string
): Promise<ExamAttendanceRecord | null> {
  const client = await getClient();
  const { data } = await client.get<ExamAttendanceRecord[]>('/api/attendance', {
    params: { studentNo },
  });
  return data[0] || null;
}

export async function saveExamAttendance(record: ExamAttendanceRecord): Promise<void> {
  const client = await getClient();
  await client.post('/api/attendance', {
    studentNo: record.studentNo,
    subject: record.subject,
    attendanceDate: record.attendanceDate || todayDateString(),
    status: record.status,
    notes: record.notes,
  });
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

  const client = await getClient();
  await client.post('/api/attendance/bulk', {
    subject: trimmedSubject,
    attendanceDate: trimmedDate,
    entries: entries.map((e) => ({
      studentNo: e.studentNo,
      present: e.present,
    })),
  });
}
