import {
  ExamLevelInfo,
  ExamSubject,
  ExamTimetableEntry,
} from '../types';
import { getClient } from './apiClient';

const DEFAULT_YEAR = '2025/2026';

export async function getExamCatalogLevels(): Promise<ExamLevelInfo[]> {
  const client = await getClient();
  const { data } = await client.get<ExamLevelInfo[]>('/api/exam-schedule/levels');
  return data;
}

export async function getExamSubjects(params?: {
  level?: string;
  academicYear?: string;
}): Promise<ExamSubject[]> {
  const client = await getClient();
  const { data } = await client.get<ExamSubject[]>('/api/exam-schedule/subjects', {
    params: {
      level: params?.level,
      academicYear: params?.academicYear || DEFAULT_YEAR,
    },
  });
  return data;
}

export async function createExamSubject(body: {
  schoolLevel: string;
  subjectName: string;
  subjectCode?: string;
  paperLabel?: string;
  academicYear?: string;
  sortOrder?: number;
}): Promise<ExamSubject> {
  const client = await getClient();
  const { data } = await client.post<ExamSubject>('/api/exam-schedule/subjects', {
    academicYear: DEFAULT_YEAR,
    ...body,
  });
  return data;
}

export async function updateExamSubject(
  id: number,
  body: Partial<{
    subjectName: string;
    subjectCode: string;
    paperLabel: string;
    sortOrder: number;
    isActive: boolean;
  }>
): Promise<ExamSubject> {
  const client = await getClient();
  const { data } = await client.put<ExamSubject>(`/api/exam-schedule/subjects/${id}`, body);
  return data;
}

export async function deleteExamSubject(id: number): Promise<void> {
  const client = await getClient();
  await client.delete(`/api/exam-schedule/subjects/${id}`);
}

export async function getExamTimetable(params?: {
  level?: string;
  academicYear?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ExamTimetableEntry[]> {
  const client = await getClient();
  const { data } = await client.get<ExamTimetableEntry[]>('/api/exam-schedule/timetable', {
    params: {
      level: params?.level,
      academicYear: params?.academicYear || DEFAULT_YEAR,
      fromDate: params?.fromDate,
      toDate: params?.toDate,
    },
  });
  return data;
}

export async function getExamSessionsForAttendance(
  level: string,
  examDate: string,
  academicYear = DEFAULT_YEAR
): Promise<ExamTimetableEntry[]> {
  const client = await getClient();
  const { data } = await client.get<ExamTimetableEntry[]>(
    '/api/exam-schedule/timetable/for-attendance',
    {
      params: { level, examDate, academicYear },
    }
  );
  return data;
}

export async function createExamTimetableEntry(body: {
  schoolLevel: string;
  examDate: string;
  examShift: number;
  subjectId: number;
  academicYear?: string;
  notes?: string;
}): Promise<ExamTimetableEntry> {
  const client = await getClient();
  const { data } = await client.post<ExamTimetableEntry>('/api/exam-schedule/timetable', {
    academicYear: DEFAULT_YEAR,
    ...body,
  });
  return data;
}

export async function deleteExamTimetableEntry(id: number): Promise<void> {
  const client = await getClient();
  await client.delete(`/api/exam-schedule/timetable/${id}`);
}

export function sessionSubjectLabel(session: ExamTimetableEntry): string {
  return session.attendanceSubject || session.displayLabel || session.subjectName;
}
