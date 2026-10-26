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

> **Note on Upstream Provider Keys & Mocks**: If running locally without upstream provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`), Selixes safely generates simulated responses so you can test end-to-end routing without paid credentials. Every mock response is clearly marked with the HTTP header `X-Selixes-Mock: true` and body field `x_selixes_mock: true`. In production (`NODE_ENV=production`), mocks are strictly disabled and unconfigured providers are skipped; if no upstream providers are configured, requests fail loudly with HTTP 503.


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

* **🔄 Cognitive Intercept (Sub-25µs Loop Breaker):** Stateful sliding-window trajectory engine intercepts infinite recursive tool loops and runaway token replay in **22.30 microseconds** (median) with 100% True Positive accuracy, preventing $100s of accidental token burn.
* **🛡️ Autonomic Provider Failover:** Automatically catches HTTP timeouts (504), rate limits (429), and API connection failures, dynamically rerouting payloads to standby backup models in milliseconds.
* **⚡ In-Memory Semantic Vector Caching (Strictly Opt-In):** Stop paying for the same answer twice. Strictly opt-in (`SEMANTIC_CACHE_ENABLED=false` by default). When the semantic cache is enabled, **Config B** (3-stage with bidirectional `cross-encoder/quora-distilroberta-base` and adaptive threshold $0.985/0.950$) is the **recommended safe configuration**, achieving a **0.15% false-hit rate on PAWS** ($3/2000$, $95\%$ UB: $0.44\%$) and **30.2% true-hit rate** ($151/500$) at **66.48 ms p50 / 86.10 ms p95** added latency ($n=100$). Stage 2 cross-encoder verification is gated via `SEMANTIC_CACHE_CROSS_ENCODER=true` (default: `false`). Enabling the cross-encoder loads `cross-encoder/quora-distilroberta-base` (~330 MB on disk) and requires an additional **~350–500 MB of container RAM**. When disabled (`SEMANTIC_CACHE_CROSS_ENCODER=false`), **Config A** (single-stage local ONNX bi-encoder `Xenova/all-MiniLM-L6-v2` + regex entity guards at default threshold **0.95**) operates as the fast, lightweight mode (~120 MB RAM overhead), adding **5.07 ms p50 / 5.89 ms p95** latency ($n=100$), but carrying a documented **1.75% false-hit rate on PAWS** ($35/2000$, $95\%$ UB: $2.42\%$) and low **3.60% true-hit rate** ($18/500$) due to word-order permutation blindness on clause swaps. Pinecone cloud storage is also supported as an optional persistent backend (`SEMANTIC_CACHE_BACKEND=pinecone`).
* **🔌 Zero-Cost Local Continuity (BYOC):** During complete cloud blackouts, Selixes can dynamically route critical tasks to a sandboxed local edge node (Llama-3 via Ollama) to maintain graceful degraded service at exactly $0.00 in token fees.
* **🔒 Sovereign & Self-Hosted:** Easily containerizable via Docker and deployed directly inside your private cloud (VPC). You never send your proprietary PII or prompts through a 3rd-party SaaS proxy.

📖 **Comprehensive Evaluation & Benchmarks:** See [BENCHMARK_REAL.md](./BENCHMARK_REAL.md).

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
