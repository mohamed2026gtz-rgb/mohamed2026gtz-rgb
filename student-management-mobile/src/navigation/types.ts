import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  StaffLogin: undefined;
  StudentFaceLogin: undefined;
  ChangePassword: undefined;
};

export type SupervisorTabParamList = {
  MyCenter: undefined;
  FindStudent: undefined;
  ExamAttendance: undefined;
  Cheating: undefined;
  Profile: undefined;
};

export type SupervisorsStackParamList = {
  SupervisorsHome: undefined;
  SupervisorList: { level: 'primary' | 'secondary' };
  SupervisorForm: { level: 'primary' | 'secondary'; id?: number };
  AssignSupervisor: { level: 'primary' | 'secondary' };
  SupervisorAssignments: { level: 'primary' | 'secondary' };
  ExamCenterDetail: {
    level: 'primary' | 'secondary';
    centerId: number;
    centerName?: string;
  };
};

export type StudentBrowseParams = {
  region?: string | null;
  regionId?: number | null;
  level?: string | null;
  schoolId?: number | null;
  autoGenerate?: boolean;
};

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentBrowse: StudentBrowseParams | undefined;
  StudentDetail: { studentNo: string };
  StudentTranscript: { studentNo: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  StudentPhoto: { uniqueId?: string };
};

export type ExamScheduleStackParamList = {
  ExamScheduleHome: undefined;
  ExamSubjects: undefined;
  ExamTimetable: undefined;
};

export type CheatingFormParams = {
  id?: number;
  subject?: string;
  examDate?: string;
};

export type CheatingStackParamList = {
  CheatingIncidents: undefined;
  CheatingForm: CheatingFormParams;
};

export type SupervisorCheatingStackParamList = {
  SupervisorCheatingMain: undefined;
  CheatingForm: CheatingFormParams;
};

export type StaffUsersStackParamList = {
  StaffUsersHome: undefined;
  StaffUserForm: { id?: string };
};

export type RootTabParamList = {
  Dashboard: undefined;
  Schools: undefined;
  Students: NavigatorScreenParams<StudentsStackParamList> | undefined;
  Attendance: undefined;
  Exams: NavigatorScreenParams<ExamScheduleStackParamList> | undefined;
  Cheating: NavigatorScreenParams<CheatingStackParamList> | undefined;
  Supervisors: NavigatorScreenParams<SupervisorsStackParamList> | undefined;
  StaffUsers: NavigatorScreenParams<StaffUsersStackParamList> | undefined;
  Teachers: undefined;
  Profile: undefined;
};
