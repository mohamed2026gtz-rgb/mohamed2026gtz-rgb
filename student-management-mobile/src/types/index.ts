export interface UserProfile {
  id: string;
  fullName?: string;
  email?: string;
  userName?: string;
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

export type UserScopeType = 'region' | 'district' | 'school_level' | 'school';

export interface UserAccessScope {
  scopeType: UserScopeType | null;
  regionId?: number | null;
  regionName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  schoolLevel?: string | null;
  schoolIds?: number[];
  schoolCount?: number;
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
  password: string;
  scopeType: UserScopeType;
  regionId?: number;
  districtId?: number;
  schoolLevel?: string;
  schoolIds?: number[];
  forcePasswordChange?: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
  mustChangePassword?: boolean;
  verification?: {
    matched: boolean;
    distance?: number | null;
    threshold?: number;
  };
  message?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Student {
  auto: number;
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
  examCenterName?: string | null;
}

export type ExamAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export const EXAM_CATALOG_LEVELS = ['Primary', 'ABE', 'Secondary', 'Technical TVET'] as const;
export type ExamCatalogLevel = (typeof EXAM_CATALOG_LEVELS)[number];

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

export interface ExamLevelInfo {
  level: string;
  expectedSubjects: number | null;
}

export function resolveExamCatalogLevel(level?: string | null): string | null {
  if (!level?.trim()) return null;
  const normalized = level.trim().toLowerCase();
  if (normalized.includes('primary')) return 'Primary';
  if (normalized === 'abe' || normalized.includes('abe')) return 'ABE';
  if (normalized.includes('tvet') || normalized.includes('technical')) return 'Technical TVET';
  if (normalized.includes('secondary')) return 'Secondary';
  const exact = EXAM_CATALOG_LEVELS.find((item) => item.toLowerCase() === normalized);
  return exact || level.trim();
}

export interface ExamAttendanceRecord {
  studentNo: string;
  subject: string;
  attendanceDate?: string;
  status: ExamAttendanceStatus;
  notes?: string;
  updatedAt: string;
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

export type CheatingSeverity = 'Minor' | 'Moderate' | 'Serious' | 'Severe';
export type CheatingStatus = 'Reported' | 'Under investigation' | 'Action taken' | 'Closed';

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
  level?: 'primary' | 'secondary';
  assignmentId?: number;
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

export interface RegionSummary {
  region: string;
  schoolCount: number;
  studentCount: number;
}

export interface LevelCount {
  level: string;
  count: number;
}

export interface Teacher {
  auto: number;
  schoolId?: string;
  fullName?: string;
  title?: string;
  telephone?: string;
}

export interface SchoolClass {
  auto: number;
  schoolId: number;
  classId?: string;
  section?: string;
  year?: string;
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

export interface CenterAttendanceStats {
  centerName: string;
  region: string | null;
  level: string;
  academicYear?: string;
  summary: AttendanceSummaryStats;
  byExamDay: AttendanceDayStat[];
  bySubject: AttendanceSubjectStat[];
}

export interface AdminAttendanceStats {
  summary: AttendanceSummaryStats;
  byRegion: AttendanceRegionStat[];
  byLevel: AttendanceLevelStat[];
  byExamDay: AttendanceDayStat[];
  bySupervisorCenter: SupervisorCenterAttendanceStat[];
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

const FULL_ADMIN_ROLES = new Set([
  'system admin',
  'manager',
  'admin',
  'administrator',
]);

const ADMINISTRATION_ROLES = new Set([
  ...FULL_ADMIN_ROLES,
  'data entry staff',
  'center',
  'district',
  'region',
  'university',
]);

const SCOPED_STAFF_ROLES = new Set(['data entry staff', 'center', 'district', 'region', 'university']);

const EXAM_SUPERVISOR_ROLES = new Set(['supervisor', 'exam supervisor']);

/** @deprecated use isAdministration */
const ADMIN_ROLES = new Set([...ADMINISTRATION_ROLES, ...EXAM_SUPERVISOR_ROLES]);

function normalizeRole(role: string) {
  return role.trim().toLowerCase();
}

export function isStudent(user?: UserProfile | null): boolean {
  return (user?.roles ?? []).some((r) => normalizeRole(r) === 'student');
}

export function isExamSupervisor(user?: UserProfile | null): boolean {
  return (user?.roles ?? []).some((r) => EXAM_SUPERVISOR_ROLES.has(normalizeRole(r)));
}

/** Exam supervisor by role or by center assignment from the API. */
export function isSupervisorUser(user?: UserProfile | null): boolean {
  return isExamSupervisor(user) || Boolean(user?.supervisorAssignment);
}

export function isAdministration(user?: UserProfile | null): boolean {
  return (user?.roles ?? []).some((r) => ADMINISTRATION_ROLES.has(normalizeRole(r)));
}

export function isFullAdmin(user?: UserProfile | null): boolean {
  return (user?.roles ?? []).some((r) => FULL_ADMIN_ROLES.has(normalizeRole(r)));
}

export function isScopedStaff(user?: UserProfile | null): boolean {
  if (user?.accessScope?.scopeType) return true;
  return (user?.roles ?? []).some((r) => SCOPED_STAFF_ROLES.has(normalizeRole(r)));
}

/** User scoped to one or more specific schools (not region/district/center level). */
export function isSchoolScopeUser(user?: UserProfile | null): boolean {
  return user?.accessScope?.scopeType === 'school';
}

/** User scoped to a whole region. */
export function isRegionScopeUser(user?: UserProfile | null): boolean {
  return user?.accessScope?.scopeType === 'region';
}

/** User scoped to a district within a region. */
export function isDistrictScopeUser(user?: UserProfile | null): boolean {
  return user?.accessScope?.scopeType === 'district';
}

/** Region or district scoped staff — limited tab set including supervisors. */
export function isRegionOrDistrictScopeUser(user?: UserProfile | null): boolean {
  const t = user?.accessScope?.scopeType;
  return t === 'region' || t === 'district';
}

/** User scoped to specific school(s) or a school level within a region. */
export function isSchoolOrSchoolLevelScope(user?: UserProfile | null): boolean {
  const t = user?.accessScope?.scopeType;
  return t === 'school' || t === 'school_level';
}

/** Full staff admin access (system admin / manager — not region/district/school scoped). */
export function isAdmin(user?: UserProfile | null): boolean {
  return isFullAdmin(user);
}

export function primaryRoleLabel(user?: UserProfile | null): string {
  if (!user?.roles?.length && user?.supervisorAssignment) return 'Exam Supervisor';
  if (!user?.roles?.length) return 'User';
  if (isStudent(user)) return 'Student';
  if (isSupervisorUser(user) && !isAdministration(user)) return 'Exam Supervisor';
  if (isAdministration(user)) return 'Administration';
  const r = user.roles[0];
  if (normalizeRole(r) === 'supervisor') return 'Exam Supervisor';
  return r;
}
