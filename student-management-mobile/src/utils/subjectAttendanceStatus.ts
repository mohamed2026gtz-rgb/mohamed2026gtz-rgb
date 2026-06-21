import { AttendanceSubjectStat, CenterAttendanceStats } from '../types';

export type SubjectAttendanceProgress = 'complete' | 'partial' | 'none';

export function getSubjectAttendanceProgress(
  stats: CenterAttendanceStats | null,
  subjectName: string,
  examDate: string
): SubjectAttendanceProgress {
  if (!stats || !subjectName.trim() || !examDate.trim()) return 'none';

  const totalStudents = stats.summary.totalStudentsInCenter ?? 0;
  if (totalStudents <= 0) return 'none';

  const entry = stats.bySubject.find(
    (row) => row.subject === subjectName.trim() && row.examDate === examDate.trim()
  );
  if (!entry) return 'none';
  if (entry.students >= totalStudents) return 'complete';
  return 'partial';
}

export function buildSubjectProgressMap(
  stats: CenterAttendanceStats | null,
  subjectNames: string[],
  examDate: string
): Record<string, SubjectAttendanceProgress> {
  const map: Record<string, SubjectAttendanceProgress> = {};
  for (const name of subjectNames) {
    map[name] = getSubjectAttendanceProgress(stats, name, examDate);
  }
  return map;
}

export function getSubjectProgressDetail(
  stats: CenterAttendanceStats | null,
  subjectName: string,
  examDate: string
): AttendanceSubjectStat | null {
  if (!stats) return null;
  return (
    stats.bySubject.find(
      (row) => row.subject === subjectName.trim() && row.examDate === examDate.trim()
    ) ?? null
  );
}
