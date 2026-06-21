import {
  isAdministration,
  isAdmin,
  isFullAdmin,
  isRegionScopeUser,
  isScopedStaff,
  primaryRoleLabel,
} from './utils/roles';

export type UserScopeType = 'region' | 'district' | 'school_level' | 'school' | 'system_admin';

export interface UserAccessScope {
  scopeType: UserScopeType | null;
  regionId?: number | null;
  districtId?: number | null;
  schoolLevel?: string | null;
  schoolIds?: number[];
  schoolCount?: number;
}

export interface UserProfile {
  id: string;
  fullName?: string;
  userName?: string;
  email?: string;
  studentNo?: string;
  registrationNo?: string | null;
  schoolId?: number;
  schoolName?: string | null;
  regionId?: number;
  districtId?: number;
  roles: string[];
  hasPicture?: boolean;
  photoUrl?: string | null;
  mustChangePassword?: boolean;
  supervisorAssignment?: SupervisorAssignment | null;
  accessScope?: UserAccessScope | null;
}

export interface StaffUser extends UserProfile {
  status?: string;
  accessScope: UserAccessScope;
  createdAt?: string;
}

export interface ScopeTypeOption {
  scopeType: UserScopeType;
  label: string;
  role: string;
}

export interface CreateStaffUserPayload {
  name: string;
  email: string;
  password?: string;
  scopeType: UserScopeType;
  regionId?: number;
  districtId?: number;
  schoolLevel?: string;
  schoolIds?: number[];
  forcePasswordChange?: boolean;
  status?: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
  mustChangePassword?: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Region {
  auto: number;
  name?: string;
  reo?: string | null;
  tell?: string | null;
  email?: string | null;
}

export interface District {
  auto: number;
  name?: string;
  region?: string;
  deo?: string | null;
  tell?: string | null;
  email?: string | null;
}

export interface School {
  schoolId: number;
  schoolNumber?: string;
  schoolName?: string;
  region?: string | null;
  regionId?: number | null;
  district?: string | null;
  schoolLevel?: string | null;
  studentCount?: number;
  isActive?: boolean;
}

export interface SchoolClass {
  auto: number;
  schoolId: number;
  classId?: string;
  section?: string;
  shift?: string;
  year?: string;
}

export interface Teacher {
  auto: number;
  schoolId?: string;
  fullName?: string;
  title?: string;
  telephone?: string;
}

export interface Student {
  auto?: number;
  studentNo: string;
  registrationNo?: string | null;
  fullName?: string;
  sex?: string;
  yearOfBirth?: string;
  studentTell?: string;
  studentAddress?: string;
  schoolId?: number;
  schoolName?: string | null;
  region?: string | null;
  classId?: string;
  uniqueIds?: string;
  status?: string;
  level?: string | null;
  schoolLevel?: string | null;
  hasPicture?: boolean;
  photoUrl?: string | null;
}

export interface EnrollmentHistory {
  year: string;
  class?: string;
  section?: string;
  term1Total?: string;
  term2Total?: string;
  status?: string;
}

export interface StudentTranscript {
  studentNo: string;
  studentName?: string;
  schoolId?: number;
  classId?: string;
  primaryRecords: unknown[];
  secondaryRecords: unknown[];
  enrollmentHistory: EnrollmentHistory[];
}

export interface LevelCount {
  level: string;
  count: number;
}

export interface RegionSummary {
  region: string;
  schoolCount: number;
  studentCount: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalSchools: number;
  presentToday: number;
  absentToday: number;
  studentsWithPicture: number;
  schoolsByLevel: LevelCount[];
  studentsByLevel: LevelCount[];
  studentsBySchoolLevel: LevelCount[];
  studentsWithPictureByLevel: LevelCount[];
  studentsWithPictureBySchoolLevel: LevelCount[];
  regionsSummary: RegionSummary[];
  schoolLevels: string[];
}

export interface AttendanceSummaryStats {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendedCount: number;
  attendancePercent: number;
  studentsWithRecords: number;
  examDaysRecorded: number;
  subjectsRecorded: number;
  coveragePercent: number;
  totalStudents?: number;
  totalStudentsInCenter?: number;
}

export interface AttendanceDayStat {
  examDate: string;
  totalRecords: number;
  students: number;
  subjects: number;
  attendedCount: number;
  absentCount: number;
  attendancePercent: number;
}

export interface AttendanceSubjectStat {
  subject: string;
  examDate: string;
  totalRecords: number;
  students: number;
  attendedCount: number;
  absentCount: number;
  attendancePercent: number;
}

export interface AttendanceRegionStat {
  region: string;
  totalStudents: number;
  studentsWithRecords: number;
  totalRecords: number;
  attendedCount: number;
  absentCount: number;
  attendancePercent: number;
  coveragePercent: number;
}

export interface AttendanceLevelStat {
  level: string;
  totalStudents: number;
  studentsWithRecords: number;
  totalRecords: number;
  attendedCount: number;
  absentCount: number;
  attendancePercent: number;
  coveragePercent: number;
}

export interface SupervisorCenterAttendanceStat {
  level: string;
  centerName: string;
  region: string | null;
  supervisorName: string;
  studentsWithRecords: number;
  totalRecords: number;
  attendedCount: number;
  absentCount: number;
  attendancePercent: number;
}

export interface AdminAttendanceStats {
  summary: AttendanceSummaryStats;
  byRegion: AttendanceRegionStat[];
  byLevel: AttendanceLevelStat[];
  byExamDay: AttendanceDayStat[];
  bySupervisorCenter: SupervisorCenterAttendanceStat[];
}

export type ExamAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface ExamAttendanceRecord {
  studentNo: string;
  subject: string;
  attendanceDate?: string;
  status: ExamAttendanceStatus;
  notes?: string;
  updatedAt?: string;
}

export const DEFAULT_YEAR = '2025/2026';

export const EXAM_CATALOG_LEVELS = [
  'Primary',
  'ABE',
  'Secondary',
  'Technical TVET',
] as const;

export type ExamCatalogLevel = (typeof EXAM_CATALOG_LEVELS)[number];

export interface ExamLevelInfo {
  level: string;
  expectedSubjects: number | null;
}

export interface ExamSubject {
  id: number;
  schoolLevel: string;
  subjectName: string;
  subjectCode?: string | null;
  paperLabel?: string | null;
  academicYear: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ExamTimetableEntry {
  id: number;
  academicYear: string;
  schoolLevel: string;
  examDate: string;
  examShift: number;
  examShiftLabel: string;
  subjectId: number;
  subjectName: string;
  subjectCode?: string | null;
  paperLabel?: string | null;
  notes?: string | null;
  displayLabel: string;
  attendanceSubject?: string;
}

export type CheatingSeverity = 'Minor' | 'Moderate' | 'Serious' | 'Severe';

export type CheatingStatus =
  | 'Reported'
  | 'Under investigation'
  | 'Action taken'
  | 'Closed';

export interface CheatingType {
  id: number;
  code: string;
  label: string;
  description?: string | null;
  sortOrder: number;
}

export interface CheatingIncident {
  id: number;
  studentNo: string;
  studentName?: string | null;
  schoolId?: number | null;
  schoolName?: string | null;
  region?: string | null;
  schoolLevel?: string | null;
  examCenterName?: string | null;
  academicYear: string;
  examDate: string;
  subject: string;
  examShift?: number | null;
  cheatingTypeId?: number | null;
  cheatingTypeCode?: string | null;
  cheatingTypeLabel?: string | null;
  customTypeLabel?: string | null;
  incidentDescription: string;
  evidenceNotes?: string | null;
  invigilatorName?: string | null;
  invigilatorAction?: string | null;
  supervisorName?: string | null;
  supervisorAction?: string | null;
  actionTaken?: string | null;
  severity: CheatingSeverity;
  status: CheatingStatus;
  followUpNotes?: string | null;
  recordedBy?: string | null;
  recordedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SupervisorLevel = 'primary' | 'secondary';

export interface Supervisor {
  id: number;
  name: string;
  sex?: string | null;
  mobile?: string | null;
  yearOfBirth?: string | null;
  residency?: string | null;
  region?: string | null;
  email?: string | null;
  currentInstitution?: string | null;
  title?: string | null;
  experienceForSupervision?: string | null;
  isActive?: boolean;
  hasPhoto?: boolean;
  photoUrl?: string | null;
}

export interface SupervisorAssignment {
  id: number;
  supervisorId: number;
  centerId: number;
  academicYear: string;
  assignedAt?: string;
  notes?: string | null;
  supervisorName?: string;
  supervisorMobile?: string | null;
  supervisorEmail?: string | null;
  centerName?: string;
  region?: string | null;
  district?: string | null;
  schoolLevel?: string;
  schoolNumber?: string | null;
  schoolCount?: number | null;
  studentCount?: number | null;
  level?: SupervisorLevel;
  assignmentId?: number;
}

export interface ExamCenter {
  id: number;
  centerName: string;
  region?: string | null;
  regionId?: number | null;
  district?: string | null;
  academicYear?: string;
  schoolCount?: number;
  schoolLevel?: string;
  schoolNumber?: string;
  level: 'Primary' | 'Secondary';
}

export interface ExamCenterSummary {
  id: number;
  centerName: string;
  region?: string | null;
  district?: string | null;
  academicYear?: string;
  level: 'Primary' | 'Secondary';
  schoolCount: number;
  studentCount: number;
}

export { isAdministration, isAdmin, isFullAdmin, isRegionScopeUser, isScopedStaff, primaryRoleLabel };

export function scopeLabel(scope: UserAccessScope | null | undefined): string {
  if (!scope?.scopeType) return 'System admin (full access)';
  switch (scope.scopeType) {
    case 'system_admin':
      return 'System admin (full access)';
    case 'region':
      return `Region #${scope.regionId ?? '?'}`;
    case 'district':
      return `District #${scope.districtId ?? '?'}`;
    case 'school_level':
      return scope.schoolLevel ? `Level: ${scope.schoolLevel}` : 'School level';
    case 'school':
      return `${scope.schoolCount ?? scope.schoolIds?.length ?? 0} school(s)`;
    default:
      return scope.scopeType;
  }
}