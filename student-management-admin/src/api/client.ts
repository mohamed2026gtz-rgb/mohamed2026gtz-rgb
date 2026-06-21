const TOKEN_KEY = 'sms_admin_token';
const API_OVERRIDE_KEY = 'sms_admin_api_base_url';
const API_PORT = '5103';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function parseConfiguredUrls(): string[] {
  const combined = [
    import.meta.env.VITE_LAN_API_URLS,
    import.meta.env.VITE_API_BASE_URL,
  ]
    .filter(Boolean)
    .join(',');

  return combined
    .split(',')
    .map((value) => normalizeBaseUrl(String(value)))
    .filter(Boolean);
}

export function getApiOverride(): string | null {
  const value = localStorage.getItem(API_OVERRIDE_KEY);
  return value ? normalizeBaseUrl(value) : null;
}

export function setApiOverride(url: string | null) {
  if (url?.trim()) {
    localStorage.setItem(API_OVERRIDE_KEY, normalizeBaseUrl(url));
    return;
  }
  localStorage.removeItem(API_OVERRIDE_KEY);
}

/** Same-host API URL when opened from another device on the LAN. */
function apiUrlFromPageHost(): string | null {
  if (typeof window === 'undefined') return null;
  const { hostname } = window.location;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  // ngrok web tunnel: use same-origin Vite /api proxy, not hostname:5103.
  if (hostname.includes('ngrok')) {
    return null;
  }
  return `http://${hostname}:${API_PORT}`;
}

function ngrokRequestHeaders(base?: string): Record<string, string> {
  const onNgrokPage =
    typeof window !== 'undefined' && window.location.hostname.includes('ngrok');
  if (onNgrokPage || base?.includes('ngrok')) {
    return { 'ngrok-skip-browser-warning': 'true' };
  }
  return {};
}

export function getApiCandidates(): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  const add = (url: string | null | undefined) => {
    if (!url) return;
    const normalized = normalizeBaseUrl(url);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  add(getApiOverride());
  add(apiUrlFromPageHost());
  parseConfiguredUrls().forEach(add);

  // Dev: Vite proxy on same origin.
  candidates.push('');

  return candidates;
}

export function getApiBaseUrl(): string {
  const candidates = getApiCandidates();
  return candidates.find(Boolean) ?? '';
}

/** Base URL reachable when a phone scans a supervisor QR code (prefer LAN/public API URL). */
export function getPublicVerifyBaseUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_VERIFY_BASE_URL?.trim();
  if (configured) return normalizeBaseUrl(configured);

  const override = getApiOverride();
  if (override) return override;

  const fromHost = apiUrlFromPageHost();
  if (fromHost) return fromHost;

  const apiBase = getApiBaseUrl();
  if (apiBase) return apiBase;

  if (typeof window !== 'undefined') {
    return normalizeBaseUrl(window.location.origin);
  }

  return '';
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildRequestUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

function networkErrorMessage(bases: string[]): string {
  const tried = bases.filter(Boolean);
  const hint = tried.length
    ? `Tried: ${tried.join(', ')}`
    : 'Using local dev proxy (/api).';
  return `Cannot reach the API server. ${hint} Make sure student-management-api is running on port ${API_PORT} and Windows Firewall allows it.`;
}

async function performFetch<T>(
  base: string,
  path: string,
  init: RequestInit
): Promise<T> {
  const url = buildRequestUrl(base, path);
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  Object.entries(ngrokRequestHeaders(base)).forEach(([key, value]) => headers.set(key, value));

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new TypeError('Failed to fetch');
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const candidates = getApiCandidates();
  for (const base of candidates) {
    try {
      return await performFetch<T>(base, path, init);
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  }

  throw new Error(networkErrorMessage(candidates));
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const candidates = getApiCandidates();
  for (const base of candidates) {
    const url = buildRequestUrl(base, path);
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    Object.entries(ngrokRequestHeaders(base)).forEach(([key, value]) => headers.set(key, value));

    try {
      const response = await fetch(url, { method: 'POST', headers, body: formData });
      const text = await response.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const message =
          typeof data === 'object' && data && 'message' in data
            ? String((data as { message: string }).message)
            : `Request failed (${response.status})`;
        throw new ApiError(response.status, message);
      }

      return data as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  }

  throw new Error(networkErrorMessage(candidates));
}

export async function checkApiHealth(): Promise<{ ok: boolean; baseUrl: string; message: string }> {
  const candidates = getApiCandidates();
  for (const base of candidates) {
    try {
      const response = await fetch(`${base || ''}/health`, {
        headers: ngrokRequestHeaders(base || undefined),
      });
      if (response.ok) {
        return {
          ok: true,
          baseUrl: base || '(same origin /api proxy)',
          message: 'API reachable',
        };
      }
    } catch {
      // try next
    }
  }

  return {
    ok: false,
    baseUrl: getApiBaseUrl(),
    message: networkErrorMessage(candidates.filter(Boolean)),
  };
}
