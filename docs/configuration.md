# Selixes Configuration Reference

This document provides a comprehensive reference for all environment variables supported by the Selixes AI Gateway.

---

## Environment Variables

### Core Server & Database

| Variable | Type | Default | Required in Prod? | Description |
| :--- | :--- | :--- | :---: | :--- |
| `NODE_ENV` | `string` | `development` | Yes | Deployment environment (`development`, `test`, `production`). |
| `PORT` | `number` | `4000` | No | HTTP port for the NestJS API gateway. |
| `DATABASE_URL` | `string` | - | **Yes** | PostgreSQL connection URL. In production, default development passwords are blocked by the startup secrets validator. |
| `REDIS_HOST` | `string` | `localhost` | No | Redis hostname for idempotency cache and rate limiting. |
| `REDIS_PORT` | `number` | `6379` | No | Redis server port. |
| `REDIS_PASSWORD` | `string` | `""` | **Yes (Prod)** | Redis authentication password. Enforced via `--requirepass` in production. |

---

### LLM Providers & Routing

| Variable | Type | Default | Required in Prod? | Description |
| :--- | :--- | :--- | :---: | :--- |
| `OPENAI_API_KEY` | `string` | `""` | Optional* | API key for OpenAI routing. (*Optional if running purely local Ollama). |
| `ANTHROPIC_API_KEY` | `string` | `""` | No | API key for Anthropic models and speculative standby failover. |
| `GEMINI_API_KEY` | `string` | `""` | No | API key for Google Gemini provider. |
| `OLLAMA_BASE_URL` | `string` | `http://localhost:11434` | No | URL to local Ollama instance for zero-egress in-VPC routing. |
| `SELIXES_ALLOW_MOCK` | `boolean` | `false` | No | Enables local mock responses when provider keys are absent (for unit testing). |

---

### Stream Splicing & Reliability

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `STREAM_STALL_MS` | `number` | `300` | Duration of upstream token silence (in milliseconds) before initiating speculative standby stream. |
| `TIME_TRAVEL_TTL_SECONDS` | `number` | `3600` | Expiration time (in seconds) for time-travel rollback checkpoints stored in Redis. |
| `GATEWAY_TEST_MODE` | `boolean` | `false` | Enables simulated outage injection. **MUST be `false` in production**; startup validator throws if enabled in prod. |
| `ALLOW_TEST_MODE_IN_PROD`| `boolean` | `false` | Explicit override allowing test mode in production for staged canary runs. |

---

### Local ONNX Semantic Caching

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `SEMANTIC_CACHE_ENABLED` | `boolean` | `false` | Master toggle to enable semantic prompt caching. |
| `SEMANTIC_CACHE_BACKEND` | `string` | `memory` | Cache backend: `memory` (in-process LRU), `redis` (shared cluster), or `pinecone` (vector DB). |
| `SEMANTIC_CACHE_CAPACITY` | `number` | `1000` | Maximum number of cached embeddings retained in memory. |
| `SEMANTIC_CACHE_LOCAL_MODEL` | `string` | `Xenova/all-MiniLM-L6-v2` | Local in-process ONNX model used for generating embeddings. |
| `SEMANTIC_CACHE_THRESHOLD` | `number` | `0.95` | Cosine similarity threshold for admitting a semantic cache hit. Calibrated to prevent semantic drift. |
| `SEMANTIC_CACHE_CROSS_ENCODER` | `boolean` | `false` | Enables Stage 2 cross-encoder reranker (`Xenova/ms-marco-MiniLM-L-6-v2`). Requires ~400MB memory. |
| `SEMANTIC_CACHE_TTL_SECONDS` | `number` | `86400` | Cache entry time-to-live in seconds (default: 24 hours). |
| `SEMANTIC_CACHE_SKIP_ON_PII` | `boolean` | `true` | Bypasses semantic cache if sensitive data (credit cards, SSNs, passports) is detected in prompt. |

---

### Security & Vault

| Variable | Type | Default | Required in Prod? | Description |
| :--- | :--- | :--- | :---: | :--- |
| `REPLAY_CRYPTO_SECRET` | `string` | - | **Yes** | 32-byte secret key used for AES-256 GCM encryption in Replay Vault. Server halts on startup if unset, empty, or default. |
| `DEV_BYPASS_TOKEN` | `string` | - | No | Local developer bypass token for CLI testing. Ignored in production. |
