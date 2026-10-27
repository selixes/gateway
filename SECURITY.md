# Security Policy

## Reporting Security Issues

We take the security of Selixes AI Gateway and the applications built on it seriously. If you discover a security vulnerability or suspect an exposure, please report it responsibly.

**Please do NOT file a public issue on GitHub for sensitive security vulnerabilities.**

Instead, please report the vulnerability privately via email:

* **Security Email:** `security@selixes.com`

### What to Include in Your Report
To help us triage and investigate as quickly as possible, please provide:
1. **Description:** A detailed explanation of the vulnerability and its potential impact.
2. **Steps to Reproduce:** Exact reproduction steps, curl commands, or proof-of-concept scripts.
3. **Environment Details:** Target version/commit, deployment mode (Docker Compose, standalone, or Zero-Egress Ollama), and environment configurations.
4. **Suggested Mitigation (if known):** Any proposed code fixes or architectural workarounds.

---

## Response & Disclosure Process

- **Acknowledgment:** We aim to acknowledge receipt of security reports within 24–48 hours.
- **Triage & Assessment:** We will investigate, confirm whether the issue is reproducible, and determine severity and blast radius.
- **Remediation & Patching:** For confirmed vulnerabilities, a patch will be authored and verified through our automated test suites and gitleaks scans.
- **Coordinated Disclosure:** We adhere to coordinated vulnerability disclosure. Once a fix is released, an advisory will be published detailing the fix and acknowledging your responsible disclosure (unless you prefer to remain anonymous).

---

## Supported Versions

Only the latest release on the `main` branch is actively supported with security patches:

| Version / Branch | Supported |
| :--- | :---: |
| `main` (Latest) | ✅ Yes |
| Historical Commits | ❌ No |

---

## Production Security Best Practices

When deploying Selixes in production, ensure the following guards are met:
1. **Startup Secrets Validation:** The server automatically validates that `REPLAY_CRYPTO_SECRET` is set to a custom 32-byte secret and that default development database passwords are not used in production (`NODE_ENV=production`).
2. **Redis Authentication:** Always enforce `--requirepass` when deploying Redis (as configured in `docker-compose.prod.yml`).
3. **Outage Simulation:** Never enable `GATEWAY_TEST_MODE=true` in production; the gateway will halt on startup if this flag is detected.
