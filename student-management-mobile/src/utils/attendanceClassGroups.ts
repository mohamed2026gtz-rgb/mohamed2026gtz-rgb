import { Student } from '../types';

/** Primary & ABE schools: 30 students per class. Secondary (and TVET): 20 per class. */
export function attendanceStudentsPerClass(schoolLevel?: string | null): number {
  const level = (schoolLevel || '').trim().toLowerCase();
  if (level.includes('primary') || level === 'abe' || level.includes('abe')) {
    return 30;
  }
  return 20;
}

export function isPrimaryOrAbeLevel(schoolLevel?: string | null): boolean {
  return attendanceStudentsPerClass(schoolLevel) === 30;
}

export interface AttendanceClassGroup {
  classNumber: number;
  label: string;
  students: Student[];
  startIndex: number;
  endIndex: number;
}

export function sortStudentsForAttendance(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const byName = (a.fullName || '').localeCompare(b.fullName || '', undefined, {
      sensitivity: 'base',
    });
    if (byName !== 0) return byName;
    return (a.registrationNo || a.studentNo).localeCompare(
      b.registrationNo || b.studentNo,
      undefined,
      { sensitivity: 'base' }
    );
  });
}

export function buildAttendanceClassGroups(
  students: Student[],
  schoolLevel?: string | null
): AttendanceClassGroup[] {
  if (!students.length) return [];

  const sorted = sortStudentsForAttendance(students);
  const size = attendanceStudentsPerClass(schoolLevel);
  const groups: AttendanceClassGroup[] = [];

  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size);
    const classNumber = groups.length + 1;
    groups.push({
      classNumber,
      label: `Class ${classNumber}`,
      students: chunk,
      startIndex: i + 1,
      endIndex: i + chunk.length,
    });
  }

  return groups;
}

export function resolveSchoolLevelForClasses(
  schoolLevel?: string | null,
  fallbackLevel?: string | null
): string | null {
  return schoolLevel?.trim() || fallbackLevel?.trim() || null;
}
