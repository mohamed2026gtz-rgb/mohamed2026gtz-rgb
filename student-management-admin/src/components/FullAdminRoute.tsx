import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function FullAdminRoute() {
  const { isAuthenticated, isFullAdminUser } = useAuth();

  if (!isAuthenticated || !isFullAdminUser) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}