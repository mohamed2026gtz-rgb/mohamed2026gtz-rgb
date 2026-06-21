import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getToken } from '../api/client';
import { getProfile, login as apiLogin, logout as apiLogout } from '../api/auth';
import type { UserProfile } from '../types';
import { isAdministration, isFullAdmin, isRegionScopeUser } from '../utils/roles';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdministrationUser: boolean;
  isFullAdminUser: boolean;
  isRegionScopeUser: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const USER_KEY = 'sms_admin_user';

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function persistUser(user: UserProfile | null) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    persistUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await getProfile();
    if (!isAdministration(profile)) {
      logout();
      throw new Error('Your account is not allowed to access administration pages.');
    }
    setUser(profile);
    persistUser(profile);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const profile = await getProfile();
        if (!isAdministration(profile)) {
          logout();
          if (!cancelled) setLoading(false);
          return;
        }
        if (!cancelled) {
          setUser(profile);
          persistUser(profile);
        }
      } catch {
        logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await apiLogin(username.trim(), password);
      if (!isAdministration(response.user)) {
        logout();
        throw new Error('Only administration users can access this admin portal.');
      }
      setUser(response.user);
      persistUser(response.user);
    },
    [logout]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user && getToken()),
      isAdministrationUser: isAdministration(user),
      isFullAdminUser: isFullAdmin(user),
      isRegionScopeUser: isRegionScopeUser(user),
      login,
      logout,
      refreshProfile,
    }),
    [user, loading, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}