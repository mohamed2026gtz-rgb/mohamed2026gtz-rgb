import { ApiError, getApiBaseUrl, getToken } from '../api/client';

function resolveUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    throw new Error('Photo URL is required');
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const base = getApiBaseUrl();
  if (!base) return trimmed;

  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export async function fetchAuthedBlob(pathOrUrl: string): Promise<Blob> {
  const url = resolveUrl(pathOrUrl);
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const message = (await response.text()) || `Photo request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return response.blob();
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}