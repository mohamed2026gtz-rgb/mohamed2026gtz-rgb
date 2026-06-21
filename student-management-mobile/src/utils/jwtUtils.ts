interface JwtPayload {
  exp?: number;
  sub?: string;
}

function decodeBase64Url(part: string): string {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }
  throw new Error('Base64 decode unavailable');
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
}

export function getTokenExpiryIso(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000).toISOString();
}
