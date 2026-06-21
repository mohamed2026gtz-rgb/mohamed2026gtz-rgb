/** Load API URL and security options from environment — never commit secrets here. */
const path = require('path');
const fs = require('fs');

// Load .env for local APK builds (EAS uses its own env).
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key.startsWith('EXPO_PUBLIC_') && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const appJson = require('./app.json');

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const lanFallbacks = (process.env.EXPO_PUBLIC_LAN_API_URLS || apiBaseUrl || 'http://192.168.20.153:5103')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      config: {
        usesNonExemptEncryption: false,
      },
    },
    extra: {
      ...appJson.expo.extra,
      apiBaseUrl,
      lanApiUrls: lanFallbacks,
      preferHttps: process.env.EXPO_PUBLIC_PREFER_HTTPS !== 'false',
      sslPinSha256: process.env.EXPO_PUBLIC_SSL_PIN_SHA256 || '',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || appJson.expo.extra?.eas?.projectId,
      },
    },
  },
};
