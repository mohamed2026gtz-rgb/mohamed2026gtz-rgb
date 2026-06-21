import { PagedResult, Student } from '../types';
import { getStudents } from './studentService';
import { getMyCenterStudents } from './supervisorMeService';

const PAGE_SIZE = 100;

async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PagedResult<T>>
): Promise<T[]> {
  const first = await fetchPage(1, PAGE_SIZE);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await fetchPage(page, PAGE_SIZE);
    items.push(...next.items);
  }
  return items;
}

export async function fetchAllStudentsForAttendance(params: {
  region: string;
  level?: string;
  schoolId: number;
}): Promise<Student[]> {
  return fetchAllPages((page, pageSize) =>
    getStudents({
      page,
      pageSize,
      region: params.region,
      level: params.level,
      schoolId: params.schoolId,
    })
  );
}

export async function fetchAllCenterStudentsForSchool(schoolId: number): Promise<Student[]> {
  return fetchAllPages((page, pageSize) =>
    getMyCenterStudents({
      page,
      pageSize,
      schoolId,
    })
  );
}
