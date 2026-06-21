import Constants from 'expo-constants';

/** RFC1918 / link-local / loopback — HTTP allowed only on private LAN for local API servers. */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host || host === 'localhost') return true;
  if (host.endsWith('.local')) return true;

  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (host === '10.0.2.2') return true;
  return false;
}

export function assertSecureApiUrl(url: string): { ok: true } | { ok: false; message: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return { ok: true };

    if (parsed.protocol === 'http:') {
      if (isPrivateOrLocalHost(parsed.hostname)) {
        return { ok: true };
      }
      return {
        ok: false,
        message:
          'Public API URLs must use HTTPS. Use http:// only for localhost or private LAN IPs (192.168.x.x).',
      };
    }

    return { ok: false, message: 'API URL must start with http:// or https://' };
  } catch {
    return { ok: false, message: 'Invalid API URL format' };
  }
}

/** Optional SHA-256 certificate pin (hex) from app config — enforced when set and URL is HTTPS. */
export function getConfiguredSslPin(): string | null {
  const pin = Constants.expoConfig?.extra?.sslPinSha256 as string | undefined;
  return pin?.trim() || null;
}

export function shouldPreferHttps(): boolean {
  return Constants.expoConfig?.extra?.preferHttps !== false;
}
