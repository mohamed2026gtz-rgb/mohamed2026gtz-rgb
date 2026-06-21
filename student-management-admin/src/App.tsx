import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FullAdminRoute } from './components/FullAdminRoute';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RegionSupervisorGuard } from './components/RegionSupervisorGuard';
import { AuthProvider } from './context/AuthContext';
import { AttendancePage } from './pages/AttendancePage';
import { CheatingFormPage } from './pages/CheatingFormPage';
import { CheatingIncidentsPage } from './pages/CheatingIncidentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExamCenterDetailPage } from './pages/ExamCenterDetailPage';
import { ExamsPage } from './pages/ExamsPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { SchoolsPage } from './pages/SchoolsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { StudentPhotoLookupPage } from './pages/StudentPhotoLookupPage';
import { StudentsPage } from './pages/StudentsPage';
import { SupervisorAssignmentsPage } from './pages/SupervisorAssignmentsPage';
import { SupervisorFormPage } from './pages/SupervisorFormPage';
import { SupervisorIdCardsPage } from './pages/SupervisorIdCardsPage';
import { SupervisorImportPage } from './pages/SupervisorImportPage';
import { SupervisorsHubPage } from './pages/SupervisorsHubPage';
import { SupervisorsReportPage } from './pages/SupervisorsReportPage';
import { SupervisorsListPage } from './pages/SupervisorsListPage';
import { TeachersPage } from './pages/TeachersPage';
import { UserFormPage } from './pages/UserFormPage';
import { UsersPage } from './pages/UsersPage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="schools" element={<SchoolsPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/photos" element={<StudentPhotoLookupPage />} />
              <Route path="students/:studentNo" element={<StudentDetailPage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="cheating" element={<CheatingIncidentsPage />} />
              <Route path="cheating/new" element={<CheatingFormPage />} />
              <Route path="cheating/:id/edit" element={<CheatingFormPage />} />
              <Route path="supervisors" element={<SupervisorsHubPage />} />
              <Route path="supervisors/:level/list" element={<SupervisorsListPage />} />
              <Route path="supervisors/:level/import" element={<SupervisorImportPage />} />
              <Route path="supervisors/:level/new" element={<SupervisorFormPage />} />
              <Route path="supervisors/:level/:id/edit" element={<SupervisorFormPage />} />
              <Route element={<RegionSupervisorGuard />}>
                <Route path="supervisors/:level/assignments" element={<SupervisorAssignmentsPage />} />
                <Route path="supervisors/:level/id-cards" element={<SupervisorIdCardsPage />} />
                <Route path="supervisors/:level/report" element={<SupervisorsReportPage />} />
              </Route>
              <Route path="supervisors/:level/centers/:centerId" element={<ExamCenterDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />

              <Route element={<FullAdminRoute />}>
                <Route path="users" element={<UsersPage />} />
                <Route path="users/new" element={<UserFormPage />} />
                <Route path="users/:id/edit" element={<UserFormPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}