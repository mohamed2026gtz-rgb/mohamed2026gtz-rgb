import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegionSupervisorGuard() {
  const { isRegionScopeUser } = useAuth();
  if (isRegionScopeUser) {
    return <Navigate to="/supervisors" replace />;
  }
  return <Outlet />;
}
