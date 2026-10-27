import { validateProductionSecrets, extractDbPassword } from './production-secrets.validator';

describe('Production Secrets Validator', () => {
  const validStrongEnv: Record<string, string> = {
    NODE_ENV: 'production',
    GATEWAY_TEST_MODE: 'false',
    DATABASE_URL: 'postgresql://prod_admin:K9%23mP2%24xL5%26qR8%21tW3@db.prod.internal:5432/selixes_gateway?sslmode=require',
    REPLAY_CRYPTO_SECRET: Buffer.alloc(32, 0x42).toString('hex'),
    REDIS_PASSWORD: 'R3d1s%23Str0ngP@ssw0rd!2026',
  };

  describe('extractDbPassword', () => {
    it('should correctly parse standard URL encoded database passwords', () => {
      const pass = extractDbPassword('postgresql://user:secret%23pass@localhost:5432/db');
      expect(pass).toBe('secret#pass');
    });

    it('should fallback to regex parsing if URL parsing fails', () => {
      const pass = extractDbPassword('postgres://user:custom_pass_123@host:5432/db');
      expect(pass).toBe('custom_pass_123');
    });

    it('should return null for malformed or missing URLs', () => {
      expect(extractDbPassword('')).toBeNull();
      expect(extractDbPassword('invalid-url')).toBeNull();
    });
  });

  describe('validateProductionSecrets', () => {
    it('should pass cleanly when a valid strong production configuration is provided', () => {
      expect(() => validateProductionSecrets(validStrongEnv)).not.toThrow();
    });

    it('should bypass all checks when NODE_ENV is development', () => {
      const devEnv = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://selixes:selixespassword@localhost:5432/selixes_gateway',
        REPLAY_CRYPTO_SECRET: 'short',
        REDIS_PASSWORD: '',
      };
      expect(() => validateProductionSecrets(devEnv)).not.toThrow();
    });

    it('should allow GATEWAY_TEST_MODE when ALLOW_TEST_MODE_IN_PROD is true, but still enforce production secret checks', () => {
      const stagingValid = {
        ...validStrongEnv,
        GATEWAY_TEST_MODE: 'true',
        ALLOW_TEST_MODE_IN_PROD: 'true',
      };
      expect(() => validateProductionSecrets(stagingValid)).not.toThrow();

      // Still rejects weak database password even if ALLOW_TEST_MODE_IN_PROD is true
      const stagingWeakDb = {
        ...validStrongEnv,
        GATEWAY_TEST_MODE: 'true',
        ALLOW_TEST_MODE_IN_PROD: 'true',
        DATABASE_URL: 'postgresql://selixes:weakpassword@localhost:5432/selixes_gateway',
      };
      expect(() => validateProductionSecrets(stagingWeakDb)).toThrow(/forbidden keyword/);

      // Still rejects missing REPLAY_CRYPTO_SECRET even if ALLOW_TEST_MODE_IN_PROD is true
      const stagingWeakReplay = {
        ...validStrongEnv,
        GATEWAY_TEST_MODE: 'true',
        ALLOW_TEST_MODE_IN_PROD: 'true',
        REPLAY_CRYPTO_SECRET: '',
      };
      expect(() => validateProductionSecrets(stagingWeakReplay)).toThrow(/REPLAY_CRYPTO_SECRET/);
    });

    it('should throw when GATEWAY_TEST_MODE is true in production', () => {
      const env = {
        ...validStrongEnv,
        GATEWAY_TEST_MODE: 'true',
      };
      expect(() => validateProductionSecrets(env)).toThrow(/GATEWAY_TEST_MODE=true is not allowed in production/);
    });

    it('should read real .env.example from disk and assert rejection of its DATABASE_URL and REPLAY_CRYPTO_SECRET in production mode', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.resolve(__dirname, '../../../../../.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const content = fs.readFileSync(envExamplePath, 'utf8');
      const parsedEnv: Record<string, string> = {};
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let val = (match[2] || '').trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          parsedEnv[match[1]] = val;
        }
      }

      // Assert DATABASE_URL from real .env.example is rejected in production
      const envWithExampleDb = {
        ...validStrongEnv,
        DATABASE_URL: parsedEnv.DATABASE_URL,
      };
      expect(() => validateProductionSecrets(envWithExampleDb)).toThrow(/forbidden keyword/);

      // Assert REPLAY_CRYPTO_SECRET from real .env.example is rejected in production
      const envWithExampleReplay = {
        ...validStrongEnv,
        REPLAY_CRYPTO_SECRET: parsedEnv.REPLAY_CRYPTO_SECRET,
      };
      expect(() => validateProductionSecrets(envWithExampleReplay)).toThrow(/contains forbidden keyword/);
    });

    it('should reject .env.example password (selixes_dev_password)', () => {
      const env = {
        ...validStrongEnv,
        DATABASE_URL: 'postgresql://selixes:selixes_dev_password@localhost:5432/selixes_gateway',
      };
      expect(() => validateProductionSecrets(env)).toThrow(/forbidden keyword/);
    });

    it('should reject the old default akrapassword', () => {
      const env = {
        ...validStrongEnv,
        DATABASE_URL: 'postgresql://flowops:akrapassword@postgres:5432/flowops',
      };
      expect(() => validateProductionSecrets(env)).toThrow(/forbidden keyword/);
    });

    it('should reject the old default selixespassword', () => {
      const env = {
        ...validStrongEnv,
        DATABASE_URL: 'postgresql://selixes:selixespassword@postgres:5432/selixes_gateway',
      };
      expect(() => validateProductionSecrets(env)).toThrow(/forbidden keyword/);
    });

    it('should reject passwords containing "changeme"', () => {
      const env = {
        ...validStrongEnv,
        DATABASE_URL: 'postgresql://admin:changeme_hard_password_123@postgres:5432/selixes_gateway',
      };
      expect(() => validateProductionSecrets(env)).toThrow(/forbidden keyword/);
    });

    it('should reject passwords shorter than 16 characters', () => {
      const env = {
        ...validStrongEnv,
        DATABASE_URL: 'postgresql://admin:Tr9%23vL2%24mK8%21@postgres:5432/selixes_gateway', // 12 chars
      };
      expect(() => validateProductionSecrets(env)).toThrow(/must be at least 16 characters long/);
    });

    it('should reject when DATABASE_URL is missing or lacks a password', () => {
      expect(() => validateProductionSecrets({ ...validStrongEnv, DATABASE_URL: '' })).toThrow(/DATABASE_URL is required/);
      expect(() => validateProductionSecrets({ ...validStrongEnv, DATABASE_URL: 'postgresql://admin@localhost:5432/db' })).toThrow(/must contain a password/);
    });

    it('should reject REPLAY_CRYPTO_SECRET if missing or shorter than 32 characters', () => {
      const envMissing = { ...validStrongEnv, REPLAY_CRYPTO_SECRET: '' };
      expect(() => validateProductionSecrets(envMissing)).toThrow(/must be set to a secure, custom key of at least 32 characters/);

      const envShort = { ...validStrongEnv, REPLAY_CRYPTO_SECRET: 'short_under_32_chars' };
      expect(() => validateProductionSecrets(envShort)).toThrow(/must be set to a secure, custom key of at least 32 characters/);
    });

    it('should reject REPLAY_CRYPTO_SECRET if it contains placeholders or default keywords', () => {
      const envReplace = {
        ...validStrongEnv,
        REPLAY_CRYPTO_SECRET: 'REPLACE_WITH_SECURE_32_BYTE_SECRET_KEY_FOR_PROD',
      };
      expect(() => validateProductionSecrets(envReplace)).toThrow(/contains forbidden keyword/);

      const envDefault = {
        ...validStrongEnv,
        REPLAY_CRYPTO_SECRET: ['selixes', 'vault', 'sentinel', 'default', '32chars'].join('_'),
      };
      expect(() => validateProductionSecrets(envDefault)).toThrow(/contains forbidden keyword/);
    });

    it('should reject if REDIS_PASSWORD is missing in production', () => {
      const env = {
        ...validStrongEnv,
        REDIS_PASSWORD: '',
      };
      expect(() => validateProductionSecrets(env)).toThrow(/REDIS_PASSWORD is required in production/);
    });
  });
});
