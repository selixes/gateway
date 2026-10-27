/**
 * Production Secrets & Environment Hardening Validator
 *
 * Validates critical infrastructure secrets on application bootstrap when running in production mode.
 * Halts startup immediately if insecure defaults, weak passwords, or missing secrets are detected.
 */

export function extractDbPassword(dbUrl: string): string | null {
  if (!dbUrl || typeof dbUrl !== 'string') {
    return null;
  }
  try {
    const parsed = new URL(dbUrl);
    return decodeURIComponent(parsed.password);
  } catch {
    // Regex fallback for postgresql/postgres URLs
    const match = dbUrl.match(/^[a-zA-Z]+:\/\/[^:]+:([^@]+)@/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

export function validateProductionSecrets(env: Record<string, string | undefined> = process.env): void {
  // Allow local development and explicit CI test overrides
  if (env.NODE_ENV !== 'production' || env.ALLOW_TEST_MODE_IN_PROD === 'true') {
    return;
  }

  // 1. Outage Simulation Flag Check
  if (env.GATEWAY_TEST_MODE === 'true') {
    throw new Error(
      'FATAL: GATEWAY_TEST_MODE=true is not allowed in production. ' +
      'This enables simulated outage injection and must never be deployed.'
    );
  }

  // 2. PostgreSQL Credentials & Password Strength
  const dbUrl = env.DATABASE_URL || '';
  if (!dbUrl.trim()) {
    throw new Error('FATAL: DATABASE_URL is required in production.');
  }

  const dbPassword = extractDbPassword(dbUrl);
  if (!dbPassword || dbPassword.trim() === '') {
    throw new Error(
      'FATAL: DATABASE_URL must contain a password in production.'
    );
  }

  const FORBIDDEN_PASSWORD_SUBSTRINGS = ['password', 'dev', 'changeme', 'akra', 'selixes'];
  const lowerDbPassword = dbPassword.toLowerCase();

  for (const forbidden of FORBIDDEN_PASSWORD_SUBSTRINGS) {
    if (lowerDbPassword.includes(forbidden)) {
      throw new Error(
        `FATAL: DATABASE_URL password contains forbidden keyword "${forbidden}". Production database credentials must not contain predictable default words.`
      );
    }
  }

  if (dbPassword.length < 16) {
    throw new Error(
      `FATAL: DATABASE_URL password must be at least 16 characters long in production (current length: ${dbPassword.length}).`
    );
  }

  // 3. Replay Vault Cryptographic Secret
  const replaySecret = env.REPLAY_CRYPTO_SECRET || '';
  if (!replaySecret || replaySecret.length < 32) {
    throw new Error(
      `FATAL: REPLAY_CRYPTO_SECRET must be set to a secure, custom key of at least 32 characters in production (current length: ${replaySecret.length}).`
    );
  }

  const FORBIDDEN_REPLAY_SUBSTRINGS = ['replace', 'default', 'selixes-vault', 'changeme'];
  const lowerReplay = replaySecret.toLowerCase();

  for (const forbidden of FORBIDDEN_REPLAY_SUBSTRINGS) {
    if (lowerReplay.includes(forbidden)) {
      throw new Error(
        `FATAL: REPLAY_CRYPTO_SECRET contains forbidden keyword "${forbidden}". Default or placeholder encryption keys are not permitted in production.`
      );
    }
  }

  // 4. Redis Password Authentication
  const redisPassword = env.REDIS_PASSWORD || '';
  if (!redisPassword || redisPassword.trim() === '') {
    throw new Error(
      'FATAL: REDIS_PASSWORD is required in production. Authenticated Redis (--requirepass) must be enforced.'
    );
  }
}
