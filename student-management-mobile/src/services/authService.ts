import { LoginResponse } from '../types';
import { getApiBaseUrl, getClient, setToken } from './apiClient';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const client = await getClient();
  const { data } = await client.post<LoginResponse>('/api/auth/login', {
    username,
    password,
  });
  await setToken(data.token);
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<LoginResponse> {
  const client = await getClient();
  const { data } = await client.post<LoginResponse>('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });
  await setToken(data.token);
  return data;
}

export async function loginWithFaceVerification(
  studentNo: string,
  selfieUri: string
): Promise<LoginResponse> {
  const base = await getApiBaseUrl();
  const client = await getClient();

  const form = new FormData();
  form.append('studentNo', studentNo.trim());
  form.append('selfie', {
    uri: selfieUri,
    name: 'selfie.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data } = await client.post<LoginResponse>('/api/auth/student-face-login', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(base.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {}),
    },
    timeout: 120000,
  });

  await setToken(data.token);
  return data;
}

export async function getProfile() {
  const client = await getClient();
  const { data } = await client.get('/api/auth/profile');
  return data;
}

export async function logout() {
  await setToken(null);
}
