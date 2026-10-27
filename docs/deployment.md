# Deployment Guide

Selixes AI Gateway is packaged as containerized services ready for deployment across private VPCs, Kubernetes, or standalone Docker hosts.

---

## Deployment Modes

### 1. Local Development (Docker Compose)
Ideal for testing on local developer machines:

```bash
# 1. Clone repository
git clone https://github.com/selixes/gateway.git
cd gateway

# 2. Copy development configuration
cp .env.example .env

# 3. Spin up PostgreSQL & Redis
docker compose up -d

# 4. Verify healthy status
docker compose ps
```

The gateway API is available on `http://localhost:4000` and the web dashboard on `http://localhost:3000`.

---

### 2. Production Deployment (`docker-compose.prod.yml`)
For staging and production deployments in private clouds or VPCs:

```bash
# Set required production secrets in your environment or secrets manager
export POSTGRES_USER=selixes_prod
export POSTGRES_PASSWORD=$(openssl rand -hex 24)
export POSTGRES_DB=selixes_production
export REDIS_PASSWORD=$(openssl rand -hex 24)
export REPLAY_CRYPTO_SECRET=$(openssl rand -hex 32)
export CLERK_SECRET_KEY=sk_live_...
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
export STRIPE_SECRET_KEY=sk_live_...
export OPENAI_API_KEY=sk-proj-...
export ANTHROPIC_API_KEY=sk-ant-...

# Launch production stack
docker compose -f docker-compose.prod.yml up -d
```

#### Production Hardening Features in `docker-compose.prod.yml`:
1. **Redis Password Enforcement:** Redis is launched with `--requirepass ${REDIS_PASSWORD:?err}` and healthchecked with `-a ${REDIS_PASSWORD}`.
2. **Startup Secrets Validation:** The NestJS API verifies database passwords, `REPLAY_CRYPTO_SECRET`, and verifies `GATEWAY_TEST_MODE=false`.
3. **Resource Limits:** Enforces CPU and memory ceilings on database, cache, and API containers to prevent noisy-neighbor exhaustion.
4. **Volume Persistence:** PostgreSQL (`postgres_data`) and Redis (`redis_data`) data directories are mounted to persistent named volumes.
5. **Zero Stack Traces in Production:** The `ProductionExceptionFilter` intercepts all 500 errors and suppresses internal stack traces.

---

### 3. Zero-Egress Sovereign In-VPC Deployment (`docker-compose.zero-egress.yml`)
For defense, healthcare, or financial enterprise environments where prompts must never leave the private network:

```bash
# Launch completely isolated stack with local Ollama
docker compose -f docker-compose.zero-egress.yml up -d

# Pull local model inside container
docker exec -it selixes-ollama ollama pull llama3:8b
```

All model routing, semantic caching (via local ONNX MiniLM), and loop protection execute entirely inside the private VPC with **0 internet egress**.
