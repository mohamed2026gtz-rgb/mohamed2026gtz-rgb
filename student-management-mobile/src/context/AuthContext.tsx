import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authService from '../services/authService';
import { getMySupervisorAssignment } from '../services/supervisorMeService';
import { createApiClient, getToken, setUnauthorizedHandler } from '../services/apiClient';
import { UserProfile, LoginResponse, isExamSupervisor } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginStudentWithFace: (studentNo: string, selfieUri: string) => Promise<LoginResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    let profile = await authService.getProfile();
    if (!profile.supervisorAssignment) {
      try {
        const assignment = await getMySupervisorAssignment();
        profile = {
          ...profile,
          supervisorAssignment: assignment,
          roles: isExamSupervisor(profile) ? profile.roles : [...(profile.roles || []), 'Supervisor'],
        };
      } catch {
        // No center assignment for this user.
      }
    }
    setUser(profile);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await createApiClient();
        const token = await getToken();
        if (token) {
          await refreshProfile();
        }
      } catch {
        await authService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
    await refreshProfile();
  }, [refreshProfile]);

  const loginStudentWithFace = useCallback(async (studentNo: string, selfieUri: string) => {
    const response = await authService.loginWithFaceVerification(studentNo, selfieUri);
    setUser(response.user);
    return response;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
    await refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const mustChangePassword = Boolean(user?.mustChangePassword);

  const value = useMemo(
    () => ({
      user,
      loading,
      mustChangePassword,
      login,
      loginStudentWithFace,
      changePassword,
      logout,
      refreshProfile,
    }),
    [user, loading, mustChangePassword, login, loginStudentWithFace, changePassword, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
