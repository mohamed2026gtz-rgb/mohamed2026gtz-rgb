import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import {
  buildAndroidConnectionCandidates,
  defaultBaseUrl,
  normalizeBaseUrl,
  PREFS_KEY,
  resolveBaseUrl,
} from '../config/api';
import { Platform } from 'react-native';
import { assertSecureApiUrl } from '../utils/networkSecurity';
import { isTokenExpired } from '../utils/jwtUtils';
import { getSecureToken, setSecureToken } from './secureStorage';

let client: AxiosInstance | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function getBaseUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(PREFS_KEY);
  return resolveBaseUrl(stored);
}

async function resolveAuthToken(): Promise<string | null> {
  const token = await getSecureToken();
  if (!token) return null;
  if (isTokenExpired(token)) {
    await setSecureToken(null);
    onUnauthorized?.();
    return null;
  }
  return token;
}

export async function createApiClient(): Promise<AxiosInstance> {
  const baseURL = await getBaseUrl();
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(async (config) => {
    config.baseURL = await getBaseUrl();
    if (config.baseURL) {
      const check = assertSecureApiUrl(config.baseURL);
      if (!check.ok) {
        return Promise.reject(new Error(check.message));
      }
    }
    if (config.baseURL?.includes('ngrok')) {
      config.headers['ngrok-skip-browser-warning'] = 'true';
    }
    const token = await resolveAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await setSecureToken(null);
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );

  client = instance;
  return instance;
}

export async function getClient(): Promise<AxiosInstance> {
  if (!client) return createApiClient();
  return client;
}

export async function setToken(token: string | null) {
  await setSecureToken(token);
  client = null;
}

export async function getToken(): Promise<string | null> {
  return resolveAuthToken();
}

export async function setApiBaseUrl(url: string) {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) {
    await AsyncStorage.removeItem(PREFS_KEY);
  } else {
    const check = assertSecureApiUrl(normalized);
    if (!check.ok) {
      throw new Error(check.message);
    }
    await AsyncStorage.setItem(PREFS_KEY, normalized);
  }
  client = null;
}

export async function getApiBaseUrl(): Promise<string> {
  return getBaseUrl();
}

function androidFallbackUrls(configured: string): string[] {
  return buildAndroidConnectionCandidates(configured);
}

/** Extract a readable message from axios / network errors. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = String((data as { message?: unknown }).message ?? '').trim();
      if (msg) return msg;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out — check API URL and that the server is running';
    }
    if (error.message === 'Network Error') {
      return 'Network error — phone cannot reach the API (check Wi‑Fi and server URL)';
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function testConnection(
  overrideUrl?: string
): Promise<{ ok: boolean; error?: string; url?: string }> {
  const stored = await getBaseUrl();
  const primary = overrideUrl?.trim() ? normalizeBaseUrl(overrideUrl) : stored;
  const candidates =
    Platform.OS === 'android'
      ? [...new Set([primary, ...androidFallbackUrls(stored)])]
      : [primary];

  const ngrokHeaders = (base: string) =>
    base.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {};

  let lastError = 'No response from server';

  for (const base of candidates) {
    const securityCheck = assertSecureApiUrl(base);
    if (!securityCheck.ok) {
      lastError = securityCheck.message;
      continue;
    }

    for (const path of ['/', '/health']) {
      try {
        const res = await axios.get(`${base}${path}`, {
          timeout: 15000,
          validateStatus: () => true,
          headers: ngrokHeaders(base),
        });
        if (res.status >= 200 && res.status < 500) {
          await setApiBaseUrl(base);
          return { ok: true, url: base };
        }
        if (res.status === 503 && String(res.data ?? '').toLowerCase().includes('unhealthy')) {
          lastError = 'API reachable but database is down';
          continue;
        }
        lastError = `HTTP ${res.status}`;
      } catch (e: unknown) {
        const err = e as { message?: string; code?: string };
        lastError = err.message || err.code || 'Network error';
      }
    }
  }
  return { ok: false, error: lastError };
}
