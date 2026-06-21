import { apiFetch, setToken } from './client';
import type { LoginResponse, UserProfile } from '../types';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(result.token);
  return result;
}

export function logout() {
  setToken(null);
}

export function getProfile() {
  return apiFetch<UserProfile>('/api/auth/profile');
}