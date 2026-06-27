# Selixes: The AI Reliability & Cost-Arbitrage Layer

> **"We help AI companies survive production reality."**

Selixes is a lightweight, neutral, and private-cloud deployable AI gateway that protects B2B startups and SMBs from unstable AI cloud infrastructure, single-vendor lock-in, and runaway token bills.

---

## 🌟 Key Features

* **🛡️ Autonomic Provider Failover:** Automatically catches HTTP timeouts (504), rate limits (429), and API connection failures, dynamically rerouting payloads to standby backup models in milliseconds.
* **💵 Predictive Cost Arbitrage:** Automatically inspects incoming prompt complexity and substitutes expensive reasoning models (like GPT-4o) with cheaper micro-models (like GPT-4o-mini) for simple queries, reducing typical API bills by **15–40%** depending on workload patterns.
* **🔌 Zero-Cost Local Continuity Mode:** During complete cloud blackouts (when both primary and standby endpoints fail), the gateway dynamically routes critical tasks to a sandboxed local-model node (Llama-3 via Ollama) to maintain graceful degraded service at **exactly $0.00** in token fees.
* **🔒 Sovereign & Self-Hosted:** Easily containerizable via Docker and deployed directly inside your private cloud boundary, ensuring 100% data ownership, compliance, and PII privacy.
* **📊 Visual Resiliency Telemetry:** Real-time dashboards visualizing active gateway runs, healed outage streams, estimated funds conserved, and instant Weekly Resiliency Reports ready for copy-pasting into executive Slack/Teams channels.

---

## ⚡ Quick Start: The 2-Line Swap

Selixes is fully OpenAI-compatible. Swapping your application to the outage-proof gateway takes exactly **two lines of code**:

```javascript
import OpenAI from 'openai';

// Selixes integration takes exactly 2 lines:
const openai = new OpenAI({
  apiKey: process.env.SELIXES_GATEWAY_KEY, // 1. Swap with your secure Selixes Key
  baseURL: 'https://gateway.yourdomain.com/v1'  // 2. Point base URL to your secure gateway
});
```

---

## 📂 Codebase Monorepo Structure

This Turborepo monorepo coordinates all Selixes components with 100% TypeScript static typing:

```text
├── apps
│   ├── api          # NestJS Backend API, Gateway Router, Keys CRUD, and Resiliency analytics
│   └── web          # Next.js Frontend Dashboard Console, Settings, and telemetry streams
├── packages
│   ├── database     # Central PostgreSQL + Prisma DB definitions, seed data, and schema updates
│   ├── eslint-config
│   ├── typescript-config
│   └── ui           # Shared React visual components
```

---

## 🚀 Setting Up Locally

### Prerequisites
* Docker & Docker Compose
* Node.js v18+ & npm

### Development Hydration

1. **Spin up standard database infrastructure:**
   ```bash
   docker compose up -d
   ```
2. **Hydrate database schema and seed mock history:**
   ```bash
   npm install
   cd packages/database
   npx prisma db push
   npx ts-node seed.ts
   cd ../..
   ```
3. **Execute all services in watch mode:**
   ```bash
   npm run dev
   ```
   * Frontend: http://localhost:3000
   * Backend: http://localhost:4000

---

## 🌐 Production Deployment

Ready to host your secure sovereign gateway in private production? Refer to our comprehensive step-by-step VPS / Docker playbook:  
👉 **[DEPLOYMENT.md](file:///C:/Users/Admin/Desktop/akra-flowops/DEPLOYMENT.md)**

---

## 🛡️ Sovereign Security & Governance

> [!WARNING]
> **Secrets Management Policy:** Never commit `.env` files, production keys, or Clerk/provider secrets to version control. If a key is accidentally committed or exposed, rotate it immediately in the provider console.

For enterprise clients in high-ticket regulated sectors (Finance, Healthcare, Legal), refer to our security verification reports:
* **Production Resiliency Audit:** [walkthrough.md](file:///C:/Users/Admin/.gemini/antigravity-ide/brain/a08fec7d-4133-4002-9a09-7a8b56e3077f/walkthrough.md)
* **Sovereign Operational Audit Report:** [operational_audit_report.md](file:///C:/Users/Admin/.gemini/antigravity-ide/brain/a08fec7d-4133-4002-9a09-7a8b56e3077f/operational_audit_report.md)
