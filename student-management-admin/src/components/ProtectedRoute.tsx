import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isAdministrationUser, loading } = useAuth();
  const token = getToken();

  if (loading) {
    return <p className="muted">Checking your session...</p>;
  }

  if (!token || !isAuthenticated || !isAdministrationUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}