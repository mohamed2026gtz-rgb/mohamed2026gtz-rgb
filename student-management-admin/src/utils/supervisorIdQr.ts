import QRCode from 'qrcode';
import { getPublicVerifyBaseUrl } from '../api/client';
import type { SupervisorLevel } from '../types';

export function buildSupervisorVerifyUrl(level: SupervisorLevel, assignmentId: number): string {
  const base = getPublicVerifyBaseUrl().replace(/\/$/, '');
  return `${base}/api/public/supervisor-verify/${level}/${assignmentId}`;
}

export async function createSupervisorQrDataUrl(payload: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(payload, {
      width: 128,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f4d31', light: '#ffffff' },
    });
  } catch {
    return null;
  }
}

export async function resolveSupervisorQrDataUrl(options: {
  level: SupervisorLevel;
  assignmentId: number;
}): Promise<string | null> {
  const verifyUrl = buildSupervisorVerifyUrl(options.level, options.assignmentId);
  return createSupervisorQrDataUrl(verifyUrl);
}