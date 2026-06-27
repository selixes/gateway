# Selixes — Sovereign AI Reliability Gateway

> One agent loop. One weekend. $3,400 gone.
>
> We built Selixes so it never happens to you.

Selixes is a **self-hosted AI gateway** that sits between your application and upstream LLM providers (OpenAI, Anthropic, Gemini, Ollama). It handles provider outages automatically, enforces hard token budgets that survive crashes, and falls back to local models — all without changing your application code.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Security Audit](https://img.shields.io/badge/Security-Audited-green.svg)](./SECURITY_AUDIT_FINDINGS.md)

---

## Why Selixes

| Problem | What Selixes Does |
|---|---|
| OpenAI goes down mid-stream | Reroutes to Anthropic/Gemini in **<15ms pre-TTFT** — user sees nothing |
| Agent loop runs $3,400 over budget | **Atomic Redis budget caps** — hard-stops at your limit, NaN-proof |
| Prompt logs contain SSNs / card numbers | **Look-ahead PII redaction** before data hits upstream logs |
| Vendor lock-in raises prices | **2-line swap** to route between any OpenAI-compatible provider |
| Duplicate requests on mobile flakiness | **Cryptographic idempotency keys** — one execution guaranteed |

---

## Quickstart

```bash
git clone https://github.com/your-org/selixes.git
cd selixes
cp .env.example .env
docker compose up -d
```

Then change **two lines** in your existing OpenAI SDK app:

```javascript
const openai = new OpenAI({
  apiKey: process.env.SELIXES_GATEWAY_KEY,   // Your API key issued by Selixes
  baseURL: 'http://localhost:4000/v1',        // Point at your local gateway
});
```

Everything else stays the same. Same SDK, same method calls, same response shape.

---

## How It Works

```
Your App
    │
    ▼
┌──────────────────────────────────────────┐
│         Selixes Gateway (port 4000)      │
│                                          │
│  Auth → Budget Check → PII Redact        │
│              │                           │
│   ┌──────────▼───────────┐               │
│   │  Dynamic Routing     │               │
│   │  + Health Scoring    │               │
│   └──┬──────────┬────────┘               │
│      │          │                        │
│   OpenAI    Anthropic  [Fallback: Ollama]│
└──────────────────────────────────────────┘
```

**Request flow:**
1. Request hits the gateway with your client API key
2. Budget reservation is atomically checked and locked in Redis
3. PII scan redacts sensitive patterns from the prompt
4. Dynamic scorer picks the healthiest, cheapest eligible provider
5. Stream begins — gateway monitors for upstream failure pre-TTFT
6. If provider fails before first token, routing silently switches — client never knows
7. On completion, telemetry is recorded and budget is updated

---

## Features

### ⚡ Sub-15ms Failover
Selixes evaluates the upstream provider *before* flushing HTTP headers to the client. If a provider fails or times out in the pre-TTFT window, the gateway transparently switches to the next healthy provider with no client-side disruption.

### 💰 Atomic Budget Enforcement
Each request atomically reserves budget in Redis before execution. If the reservation fails (limit reached), the request is rejected immediately — no race conditions, no NaN-overflows, no runaway spend.

### 🕵️ PII Redaction Pipeline
A look-ahead masking stage inspects incoming prompts for emails, SSNs, IBANs, phone numbers, and credential-like patterns. Detected values are redacted before the prompt is transmitted to any upstream API.

### 📊 Observability Dashboard
Built-in Next.js telemetry console showing live provider health, circuit breaker states, cost-by-provider analytics, and encrypted trace replay.

### 🔒 Self-Hosted & Private
Your prompts and responses never leave your infrastructure. Deploy in your own VPC in under 2 minutes with Docker Compose.

---

## Architecture

| Layer | Technology |
|---|---|
| Gateway API | NestJS (Node.js) |
| Observability Dashboard | Next.js |
| Budget & Health State | Redis |
| Telemetry Persistence | PostgreSQL (via Prisma) |
| Auth | Clerk (or dev bypass for local) |
| Deployment | Docker Compose |

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment instructions including:
- Self-hosted VPS (Ubuntu 22.04+)
- Docker Compose prod configuration
- Nginx reverse proxy + SSL
- Automated nightly database backups

---

## Security

We published our full internal security audit findings and hardening recommendations. This is unusual for an open-source project — we did it because transparency builds trust.

- [SECURITY_AUDIT_FINDINGS.md](./SECURITY_AUDIT_FINDINGS.md) — 23 findings, all resolved
- [SECURITY_HARDENING_RECOMMENDATIONS.md](./SECURITY_HARDENING_RECOMMENDATIONS.md) — ongoing hardening guidelines

To verify your self-hosted deployment is correctly hardened:

```bash
node verify_agent_protection.js
node verify_resiliency_hardened.js
```

---

## Pricing

| Tier | Price | Details |
|---|---|---|
| **Community** | Free | Self-hosted, unlimited, MIT licensed |
| **Cloud Gateway** | $0.0006/request | Managed, no infra needed |
| **Enterprise** | Contact us | Custom routing policies, SLA, VPC deploy |

[selixes.com](https://selixes.com) · [support@selixes.com](mailto:support@selixes.com)

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.

---

## License

MIT — see [LICENSE](./LICENSE)
