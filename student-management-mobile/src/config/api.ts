import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PREFS_KEY = 'api_base_url';
const PORT = 5103;

export const defaultAndroidEmulatorUrl = `http://10.0.2.2:${PORT}`;
export const androidAdbReverseUrl = `http://127.0.0.1:${PORT}`;
export const defaultLocalUrl = `http://localhost:${PORT}`;

export function getConfiguredApiBaseUrl(): string | null {
  const url = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  return url?.trim() || null;
}

export function getLanApiFallbackUrls(): string[] {
  const fromExtra = Constants.expoConfig?.extra?.lanApiUrls as string[] | undefined;
  if (Array.isArray(fromExtra) && fromExtra.length) {
    return fromExtra.map((u) => normalizeBaseUrl(u)).filter(Boolean);
  }
  const single = getConfiguredApiBaseUrl();
  return single ? [single] : [];
}

/** Physical Android phones need the PC LAN IP — 10.0.2.2 is emulator-only. */
export function defaultBaseUrl(): string {
  const configured = getConfiguredApiBaseUrl();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  const lanFallbacks = getLanApiFallbackUrls();
  if (lanFallbacks.length) {
    return lanFallbacks[0];
  }

  if (Platform.OS === 'android') {
    if (Constants.isDevice) {
      return `http://192.168.20.153:${PORT}`;
    }
    return defaultAndroidEmulatorUrl;
  }
  return defaultLocalUrl;
}

/** Strips trailing slashes and `/api` suffix. */
export function normalizeBaseUrl(url: string): string {
  let normalized = url.trim();
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (normalized.toLowerCase().endsWith('/api')) {
    normalized = normalized.slice(0, -4);
  }
  return normalized;
}

/** Metro bundler ports — never valid API URLs. */
const INVALID_API_PORTS = new Set(['8081', '8082', '19000', '19001']);

export function isValidApiBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.port && INVALID_API_PORTS.has(parsed.port)) return false;
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveBaseUrl(stored: string | null | undefined): string {
  const normalized = stored?.trim();
  if (normalized) {
    const url = normalizeBaseUrl(normalized);
    if (isValidApiBaseUrl(url)) return url;
  }
  return defaultBaseUrl();
}

export function buildAndroidConnectionCandidates(configured: string): string[] {
  return [
    ...new Set(
      [
        configured,
        ...getLanApiFallbackUrls(),
        defaultBaseUrl(),
        defaultAndroidEmulatorUrl,
        androidAdbReverseUrl,
      ].filter((u) => u && isValidApiBaseUrl(u))
    ),
  ];
}

export { PREFS_KEY };
