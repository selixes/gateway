# Selixes Gateway — Security Hardening Recommendations

**Date:** 2026-06-18
**Scope:** General posture improvements for a small, fast-moving codebase preparing for Enterprise customers
**Companion Document:** [SECURITY_AUDIT_FINDINGS.md](file:///c:/Users/Admin/Desktop/akra-flowops/SECURITY_AUDIT_FINDINGS.md)

---

## 1. Secrets Management

### Current State
- Secrets stored in `.env` files on disk (developer machines, self-hosted deployments)
- Hardcoded fallback encryption key in `replay.service.ts`
- No secrets rotation mechanism
- No secrets validation on startup

### Recommendations

**Immediate (before Enterprise launch):**
- **Remove all hardcoded secret fallbacks.** The Replay Vault key (`akra-shield-default-secure-vault-key-32b`), dev bypass tokens (`bypass-token-selixes`), and default database credentials (`akrapassword`) should all either require explicit configuration or fail loudly on startup.
- **Add a startup validation function** in `main.ts` that checks for required secrets and rejects known-dangerous defaults in production:
  ```typescript
  function validateProductionSecrets() {
    const required = ['CLERK_SECRET_KEY', 'DATABASE_URL', 'REPLAY_CRYPTO_SECRET'];
    const forbidden = ['akrapassword', 'bypass-token', 'default-secure-vault'];
    // Throw on missing or dangerous values
  }
  ```
- **Rotate the exposed Clerk test key** (`sk_test_izZ6yN...`) immediately in the Clerk dashboard, even though it's a test key.

**Short-term (next sprint):**
- Adopt **Docker secrets** or **environment variable injection** for self-hosted deployments instead of `.env` files. Update `docker-compose.prod.yml` to use Docker secrets:
  ```yaml
  secrets:
    clerk_secret:
      external: true
    replay_crypto:
      external: true
  ```
- For Gateway Cloud, use your cloud provider's secrets manager (AWS Secrets Manager, GCP Secret Manager, or Vault) with injection at deploy time.

**Long-term:**
- Implement API key rotation: allow customers to create a new key, migrate traffic, then revoke the old key — without downtime.
- Consider a dedicated secrets management service (HashiCorp Vault) for Enterprise deployments.

---

## 2. Dependency Update Cadence

### Recommendations

- **Run `npm audit` weekly** and fix High/Critical CVEs within 48 hours.
- **Enable Dependabot** (GitHub) or **Renovate** for automated dependency update PRs:
  ```yaml
  # .github/dependabot.yml
  version: 2
  updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule:
        interval: "weekly"
      open-pull-requests-limit: 10
      labels:
        - "dependencies"
        - "security"
  ```
- **Pin major versions** in `package.json` (use `~` not `^` for security-sensitive deps like `@clerk/backend`, `ioredis`, `axios`).
- **Lock file integrity:** Ensure `package-lock.json` is committed and CI uses `npm ci` (not `npm install`) to prevent supply chain attacks via lock file manipulation.

---

## 3. CI Security Checks

### Recommended CI Pipeline Additions

```yaml
# Add to your CI workflow (GitHub Actions / GitLab CI)
security-checks:
  steps:
    # 1. Dependency vulnerability scan
    - run: npm audit --production --audit-level=high
    
    # 2. Secret scanning (prevent accidental commits)
    - uses: trufflesecurity/trufflehog@main
      with:
        extra_args: --only-verified
    
    # 3. Static analysis
    - run: npx eslint --ext .ts apps/api/src/ --rule '{"no-eval": "error"}'
    
    # 4. License compliance (for Enterprise)
    - run: npx license-checker --production --failOn 'GPL-3.0'
```

### Pre-commit Hooks
Install `husky` + `lint-staged` with a secret scanner:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,js,json,env}": [
      "grep -rn 'sk_test_\\|sk_live_\\|password.*=.*[a-zA-Z]' && exit 1 || true"
    ]
  }
}
```

---

## 4. Input Validation Library

### Current State
- `class-validator` is used for the `CreateCompletionDto` body — this is good
- **No validation on HTTP headers** (`x-selixes-session-id`, `x-selixes-max-session-cost`, etc.)
- No validation on Redis key components

### Recommendations

**Create a shared validation utility:**
```typescript
// src/common/input-sanitizer.ts
export function sanitizeSessionId(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toString().trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(cleaned)) return null;
  return cleaned;
}

export function sanitizeBudgetHeader(raw: string | undefined): number | null {
  if (!raw) return null;
  const val = parseFloat(raw.toString());
  if (!Number.isFinite(val) || val <= 0 || val > 1_000_000) return null;
  return val;
}

export function sanitizeTimeoutHeader(raw: string | undefined): number {
  if (!raw) return 10_000;
  const val = parseInt(raw.toString(), 10);
  if (!Number.isFinite(val) || val < 100 || val > 120_000) return 10_000;
  return val;
}
```

**Apply consistently** at the entry point of `parseOverrides()` and the budget gate section of `handleChatCompletion()`.

---

## 5. Logging Hygiene

### Current Issues
- Clerk secret key partially logged (first 12 chars)
- Session IDs logged without sanitization (log injection risk)
- Client IP logged in execution events
- No structured secret-masking in log pipeline

### Recommendations

**Immediate:**
- Remove the partial Clerk key from log output in `clerk-auth.guard.ts` line 56-59
- Sanitize all user-controlled values before logging (strip newlines, limit length)
- Never log API key values — log only the key *ID* (UUID), not the key itself

**Pino Redaction Configuration:**
```typescript
// In app.module.ts LoggerModule config
pinoHttp: {
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
}
```

**Add a log sanitizer middleware** that strips sensitive patterns from all log output:
```typescript
const SENSITIVE_PATTERNS = [
  /selixes_live_[a-f0-9]{32}/g,
  /sk_(test|live)_[a-zA-Z0-9]+/g,
  /Bearer\s+[a-zA-Z0-9._-]+/g,
];
```

---

## 6. API Key Security Improvements

### Hash Storage Migration Plan

1. Add a new column `keyHash` (SHA-256) to the `ApiKey` model
2. Write a migration that computes `sha256(key)` for all existing rows and populates `keyHash`
3. Update `ClerkAuthGuard` to lookup by `keyHash` instead of `key`
4. Update `KeysService.create()` to store hash, return raw key only once
5. After confirming no regressions, drop the plaintext `key` column (or null it out)
6. Update Redis cache keys to use `sha256(token)` instead of the raw token

### Key Rotation Support
- Allow a grace period where both old and new keys are valid (e.g., 24 hours)
- Provide an API endpoint to regenerate a key, returning the new raw key
- Log key creation and revocation events in the `AuditLog` table

---

## 7. Redis Hardening

- **Add authentication:** `--requirepass` in production Redis config
- **Disable dangerous commands:** `rename-command FLUSHALL ""` in redis.conf
- **Bind to internal interface only:** Already handled by Docker networking in prod, but add `--bind 127.0.0.1` explicitly
- **Enable TLS** for Redis connections in Gateway Cloud
- **Fix the `eval()` fallback:** Return a proper rate-limiter-compatible response instead of `'OK'`

---

## 8. Fail-Open vs Fail-Closed Policy

| Tier | Redis Down: Rate Limiting | Redis Down: Budget Enforcement | Redis Down: Prompt Cache |
|------|--------------------------|-------------------------------|------------------------|
| Community (self-hosted) | Fail-open + WARN log | Fail-open + WARN log | Skip cache (already does this) |
| Gateway Cloud (Standard) | Fail-closed (503) | Fail-closed (503) | Skip cache |
| Gateway Cloud (Enterprise) | Fail-closed (503) | Fail-closed (503) | Skip cache |

Add a `GATEWAY_TIER` environment variable that controls this behavior, with `community` as the default.

---

## 9. Third-Party Penetration Test Recommendation

> **Recommendation: YES — a third-party pen test is warranted before Enterprise customers are onboarded.**

### Justification:
1. **The threat model is high-stakes:** This product handles API keys, billing enforcement, and proxies requests to external services. A vulnerability could result in financial loss (runaway API spend), data exposure (prompt/response content), or service abuse (rate limit bypass).

2. **The audit found 6 Critical findings:** Several of these (unhashed API keys, unauthenticated endpoints, hardcoded encryption keys) are the kinds of issues that a professional pen tester would also find — and potentially exploit more creatively.

3. **Enterprise customers will ask:** Any enterprise customer doing vendor security review will want to see a pen test report. Having one proactively demonstrates security maturity.

4. **Specific areas for the pen test:**
   - API endpoint fuzzing (especially the header-based configuration)
   - Redis interaction testing (injection, unauthorized access)
   - Authentication bypass attempts
   - Rate limit evasion under load
   - SSRF via provider configuration
   - Session management and tenant isolation

### Recommended Vendors:
- **For a startup budget:** HackerOne or Bugcrowd managed pen test ($5K-$15K)
- **For enterprise credibility:** Bishop Fox, Trail of Bits, or NCC Group ($25K-$75K)
- **Timeline:** Complete pen test before first Enterprise contract signing, not after

---

## 10. Priority Remediation Roadmap

### Week 1 (Critical — before any new customer onboarding)
- [ ] Add auth guards to `/v1/metrics` and `/v1/replay/:traceId`
- [ ] Remove hardcoded Replay Vault fallback key (require env var)
- [ ] Rotate exposed Clerk test key
- [ ] Add session ID format validation (alphanumeric, max 128 chars)
- [ ] Fix `NaN`/`Infinity` bypass in budget headers

### Week 2 (High — before Enterprise tier launch)
- [ ] Implement API key hashing (SHA-256) in Postgres
- [ ] Fix Redis `eval()` fallback to return proper rate-limiter response
- [ ] Add LRU cap to in-memory fallback Maps (10,000 entries)
- [ ] Remove `x-bypass-auth` header bypass
- [ ] Make monthly budget check atomic (Lua script)

### Week 3 (Medium — before scale)
- [ ] Add Redis authentication in production docker-compose
- [ ] Set up Dependabot / Renovate
- [ ] Add `npm audit` to CI pipeline
- [ ] Implement Pino log redaction for sensitive headers
- [ ] Add startup validation for production secrets

### Week 4+ (Ongoing)
- [ ] Scope and commission third-party pen test
- [ ] Evaluate PII detection library (Presidio or Google DLP) for Enterprise tier
- [ ] Design and prototype single-tenant isolation architecture
- [ ] Implement per-organization aggregate rate limiting
