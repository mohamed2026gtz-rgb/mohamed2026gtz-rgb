import * as FileSystem from 'expo-file-system/legacy';
import { getApiBaseUrl, getToken } from './apiClient';
import { SupervisorLevel } from '../types';

/** Download an authenticated API photo to a local cache URI (Android needs JWT on download). */
export async function downloadAuthenticatedPhotoUri(
  relativeOrAbsoluteUrl: string,
  cacheFileName: string
): Promise<string> {
  const base = await getApiBaseUrl();
  const token = await getToken();
  const url = relativeOrAbsoluteUrl.startsWith('http')
    ? relativeOrAbsoluteUrl
    : `${base}${relativeOrAbsoluteUrl.startsWith('/') ? '' : '/'}${relativeOrAbsoluteUrl}`;
  const dest = `${FileSystem.cacheDirectory}${cacheFileName}`;

  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  const result = await FileSystem.downloadAsync(url, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    throw new Error('Could not download photo');
  }

  return result.uri;
}

export async function downloadSupervisorPhotoUri(
  level: SupervisorLevel,
  supervisorId: number
): Promise<string> {
  return downloadAuthenticatedPhotoUri(
    `/api/supervisors/${level}/${supervisorId}/photo`,
    `supervisor-photo-${level}-${supervisorId}.jpg`
  );
}
