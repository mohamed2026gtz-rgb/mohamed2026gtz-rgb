function validateEnvironment() {
  const required = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER'];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const secret = process.env.JWT_SECRET.trim();
  if (secret.length < 32) {
    console.warn('[security] JWT_SECRET should be at least 32 characters for production use.');
  }

  if (!process.env.JWT_ISSUER?.trim() || !process.env.JWT_AUDIENCE?.trim()) {
    console.warn('[security] Set JWT_ISSUER and JWT_AUDIENCE in .env for token validation.');
  }
}

module.exports = { validateEnvironment };
