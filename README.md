# Selixes: The AI Reliability Layer

[![Selixes Chaos Engineering](https://github.com/selixes/gateway/actions/workflows/chaos-testing.yml/badge.svg)](https://github.com/selixes/gateway/actions/workflows/chaos-testing.yml)

> **"We help AI applications survive production reality."**

Selixes is the AI Reliability Layer for production applications. It is a self-hosted, neutral control plane that protects engineering teams from unstable AI cloud infrastructure, silent provider outages, and runaway token bills.

If you are building an AI-native product, you are delegating your uptime to OpenAI, Anthropic, or Google. Selixes reclaims that control.

---

## ⚡ Time to First Request: 5 Minutes

Selixes is 100% compatible with the standard OpenAI SDK. Securing your application against provider outages takes exactly **two lines of code**.

### 1. The 2-Line SDK Drop-in

Swap your `baseURL` and `apiKey` to point to your local Selixes layer:

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.SELIXES_API_KEY,      // 1. Secure Selixes Key
  baseURL: 'http://localhost:4000/v1'       // 2. Point to the Selixes Engine
});
```

### 2. Dispatch a Reliable Request

Pass transaction cost caps, timeout limits, and caching directives directly through standard HTTP request headers. Selixes autonomously handles the rest.

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Extract details from CSV invoices' }],
  headers: {
    'x-selixes-timeout': '5000',           // Instantly failover to Anthropic if OpenAI takes > 5s
    'x-selixes-max-session-cost': '0.15',  // Autonomously block if session spend exceeds $0.15
    'x-selixes-semantic-cache': 'true'     // Serve instantly from vector DB if a similar prompt exists
  }
});
```

---

## 🌟 Why Selixes Exists

* **🛡️ Autonomic Provider Failover:** Automatically catches HTTP timeouts (504), rate limits (429), and API connection failures, dynamically rerouting payloads to standby backup models in milliseconds.
* **⚡ True Semantic Caching:** Stop paying for the same answer twice. Selixes uses Pinecone vector embeddings to cache responses based on meaning, not just exact string matches, reducing latency to ~50ms.
* **🔌 Zero-Cost Local Continuity (BYOC):** During complete cloud blackouts, Selixes can dynamically route critical tasks to a sandboxed local edge node (Llama-3 via Ollama) to maintain graceful degraded service at exactly $0.00 in token fees.
* **🔒 Sovereign & Self-Hosted:** Easily containerizable via Docker and deployed directly inside your private cloud (VPC). You never send your proprietary PII or prompts through a 3rd-party SaaS proxy.

---

## 🚀 Setting Up Locally

Want to see it in action? 

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
   * Frontend Telemetry Dashboard: http://localhost:3000
   * Core Engine API: http://localhost:4000

---

## 🌐 Production Deployment

Ready to host your secure sovereign layer in private production? Refer to our comprehensive step-by-step VPS / Docker playbook:  
👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## 🧠 AI-Native Operational Intelligence

Standard observability tools (like Datadog) tell you *that* a request failed. 
Selixes tells you *why* it failed, and *what* it did to save the transaction. 

Boot up the companion dashboard to audit token economics, inspect provider decision chains, and export weekly resiliency logs directly into Slack or Teams.
