# Selixes — Deployment Guide

## Self-Hosted VPS (Recommended for MVP)

This guide deploys the full platform on a single Linux VPS (Ubuntu 22.04+).

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker | 24+ | `curl -fsSL https://get.docker.com | sh` |
| Docker Compose | v2+ | included with Docker Desktop |
| Clerk Account | — | [clerk.com](https://clerk.com) |
| Domain | — | Cloudflare recommended |

---

## 1. Clone and Configure

```bash
git clone https://github.com/selixes/gateway.git
cd gateway
cp .env.production.example .env.production
```

Edit `.env.production`:

```env
# ── Managed External Data Tier (Decoupled SPOF Elimination) ──
# Current Production Database: Neon Serverless PostgreSQL in AWS us-east-1 (N. Virginia)
# Pooled PgBouncer connection (port 5432, server-side PgBouncer active):
DATABASE_URL="postgresql://neondb_owner:<password>@ep-sparkling-queen-awnip6gt-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require&sslaccept=accept_invalid_certs"

# Direct connection (for schema migrations / prisma db push):
# DATABASE_URL="postgresql://neondb_owner:<password>@ep-sparkling-queen-awnip6gt.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require&sslaccept=accept_invalid_certs"

# Upstash Serverless Redis (TLS Active, Sub-2ms Lua Execution, AWS us-east-1)
REDIS_URL="rediss://default:<token>@talented-monkey-289901.upstash.io:6379"

# Clerk (from https://clerk.com → API Keys)
CLERK_SECRET_KEY=sk_live_xxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxx
CLERK_WEBHOOK_SECRET=whsec_xxxx

# App URL (your domain)
APP_URL=https://selixes.com
API_URL=https://api.selixes.com

# Alerts (optional — leave blank to disable)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
RESEND_API_KEY=re_xxxx
ALERT_EMAIL=alerts@selixes.com
```

### Regional Topology & Latency Performance Characteristics

| Tier / Topology | Database Region | Redis Region | Gateway Latency to DB (Read / Write) | Gateway Latency to Redis | Failover Circuit Decision | Status / Reality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Current Reality (Neon Free Tier)** | **AWS `us-east-1` (N. Virginia)** | **AWS `us-east-1`** | **Read: 2.26ms p50 \| Write: 3.07ms p50** (Warm)<br>*(Cold Socket TLS: 27–121ms \| Wake-up: ~755ms)* | **1.20ms – 4.50ms** | **11.41ms p50** (Async Decoupled) | **ACTIVE PRODUCTION ($0/mo)** |
| **Upgrade Target (Neon Launch / Scale)** | **AWS `us-east-1` (N. Virginia)** | **AWS `us-east-1`** | **Read: 2.26ms p50 \| Write: 3.07ms p50** (Warm)<br>*(Auto-suspend disabled: 0ms cold wake-up)* | **1.20ms – 4.50ms** | **11.41ms p50** | **Documented Upgrade ($19/mo)** |

> [!NOTE]
> **Production Reality, Detailed Latency Regimes & Upgrade Path:**
> * **Current Production State ($0/mo Free Tier):** The live database runs on Neon Serverless PostgreSQL in AWS `us-east-1` (N. Virginia) co-located with the Lightsail API gateway. Due to the asynchronous fire-and-forget audit-logging architecture, the LLM failover critical path remains ultra-fast (**11.41ms p50**).
> * **Empirical Database Latency Regimes (AWS `us-east-1` Gateway $\rightarrow$ Neon):**
>   1. **Warm Pool Query Execution (Steady State):**
>      - **Read Latency (SELECT 1 row):** `1.86ms` min, **`2.26ms` p50**, `2.25ms` avg, `3.02ms` p95
>      - **Write Latency (INSERT):** `2.83ms` min, **`3.07ms` p50**, `3.48ms` avg, `10.38ms` p95
>      - **Write Latency (UPDATE):** `2.58ms` min, **`3.92ms` p50**, `4.90ms` avg, `14.08ms` p95
>   2. **Fresh Socket / TLS Handshake Overhead:** Opening a brand-new TCP socket and TLS handshake through Neon's native PgBouncer proxy layer takes **`27.36ms – 121.20ms`** (this was the source of initial ~85ms benchmarks before connection reuse). Application connection pools (`prisma` / `pg.Pool`) reuse connections to maintain steady-state sub-4ms writes.
>   3. **Scale-to-Zero Compute Wake-Up:** After 300 seconds (5 minutes) of complete inactivity, compute suspends to zero. The first incoming request incurs a **`~755ms`** wake-up penalty (734ms boot/storage attach + 21ms query execution) before returning to warm ~2.2ms reads and ~3.0ms writes.
> * **Known Limitations:** 100 CU-hour free tier monthly quota (running a 4-minute keep-alive ping would burn 180 CU-hours and suspend the DB by day 16; do NOT keep-alive ping on Free Tier).
> * **Upgrade Path:** When budget / YC funding allows ($19/mo for Neon Launch tier), disable auto-suspend (`suspend_timeout_seconds: 0`) in Neon Console/API to keep compute permanently active. This eliminates the 755ms cold start completely with zero code or configuration changes.

---

## 2. Apply Database Schema to Managed PostgreSQL

With the external Neon PostgreSQL instance, schema migrations are pushed directly via Prisma (using the direct connection endpoint):

```bash
# Push schema migrations to managed Neon PostgreSQL
cd packages/database
DATABASE_URL="postgresql://neondb_owner:<password>@ep-sparkling-queen-awnip6gt.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require&sslaccept=accept_invalid_certs" npx prisma db push
```

---

## 3. Decommission Legacy Co-Located Containers & Start Platform

To eliminate the Single Point of Failure (SPOF), stop and decommission the old local PostgreSQL and Redis containers:

```bash
# 1. Stop and remove the legacy co-located containers
docker compose -f docker-compose.prod.yml stop postgres redis
docker compose -f docker-compose.prod.yml rm -f postgres redis

# 2. Launch the stateless API and Web runtime
docker compose -f docker-compose.prod.yml up -d api web
```

Check health and live runtime connectivity:
```bash
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost:4000/health
```

---

## 4. Nginx Reverse Proxy (optional, recommended)

Install nginx and create `/etc/nginx/sites-available/flowops`:

```nginx
# Web frontend
server {
    server_name flowops.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# API
server {
    server_name api.flowops.yourdomain.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and configure SSL with Let's Encrypt:
```bash
ln -s /etc/nginx/sites-available/flowops /etc/nginx/sites-enabled/
certbot --nginx -d flowops.yourdomain.com -d api.flowops.yourdomain.com
systemctl reload nginx
```

#### SSL Auto-Renewal Verification
Let's Encrypt certificates are valid for 90 days. Certbot automatically schedules systemd timers or cron jobs to handle auto-renewal. Test the renewal process to verify it is active:
```bash
certbot renew --dry-run
```

---

## 5. Configure Clerk Webhooks

In Clerk Dashboard → Webhooks → Add endpoint:
- URL: `https://api.flowops.yourdomain.com/webhooks/clerk`
- Events: `user.created`, `user.updated`, `organization.created`, `organizationMembership.created`
- Copy the signing secret → `CLERK_WEBHOOK_SECRET` in `.env.production`

---

## 6. Seed Demo Data (optional)

```bash
docker compose -f docker-compose.prod.yml exec api \
  node -e "require('./dist/seed')"
```

Or run locally against production DB:
```bash
cd packages/database
DATABASE_URL=postgresql://flowops:<pass>@<your-vps-ip>:5432/flowops \
  npx ts-node seed.ts
```

---

## 7. Production Hardening & Reliability

### Container Resource Limits
Our `docker-compose.prod.yml` enforces strict hardware boundaries to guarantee high-availability:
- **API & Web Containers**: Capped at 1.0 CPU core and 512MB RAM.
- **Database & Redis Containers**: Capped at 0.5 CPU cores and 256MB RAM.

This isolates components and prevents runaway memory leaks or high load spikes from impacting other system services on your VPS.

### Log Rotation Protection
To prevent container log growth from exhausting all hard drive storage over time, all Docker services use the `json-file` logging driver configured with strict rotations:
- `max-size: "10m"` (maximum log file size is 10MB)
- `max-file: "3"` (keeps at most 3 historical rotation files, totaling 30MB max per container)

---

## 8. Database Automated Backups

Always back up your database to prevent data loss. 

### Manual Backup Dump
Generate a compressed backup of your database:
```bash
mkdir -p /var/backups/flowops
docker exec -t flowops-postgres pg_dump -U flowops flowops | gzip > /var/backups/flowops/flowops_db_$(date +%F_%H-%M-%S).sql.gz
```

### Automated Nightly Backups (Cron Job)
Create a backup shell script at `/usr/local/bin/flowops-backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/flowops"
mkdir -p "$BACKUP_DIR"
FILENAME="$BACKUP_DIR/db_$(date +%F_%H%M%S).sql.gz"

# Dump database
docker exec -t flowops-postgres pg_dump -U flowops flowops | gzip > "$FILENAME"

# Delete backups older than 14 days to conserve disk space
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
```

Make it executable:
```bash
chmod +x /usr/local/bin/flowops-backup.sh
```

Configure a system cron job to run it every night at 2:00 AM. Run `crontab -e` and append:
```cron
0 2 * * * /usr/local/bin/flowops-backup.sh >/dev/null 2>&1
```

---

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Local Development

```bash
# Start infra
docker compose up -d    # postgres + redis

# Install deps
npm install

# Push schema
cd packages/database && npx prisma db push && cd ../..

# Seed demo data
cd packages/database && npx ts-node seed.ts && cd ../..

# Start API (terminal 1)
cd apps/api && npm run start:dev

# Start Web (terminal 2)
cd apps/web && npm run dev
```

Open http://localhost:3000

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend secret |
| `CLERK_WEBHOOK_SECRET` | ✅ | Clerk webhook signing secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `APP_URL` | ✅ | Public URL of the web app |
| `SLACK_WEBHOOK_URL` | Optional | Slack incoming webhook for failure alerts |
| `RESEND_API_KEY` | Optional | Resend API key for email alerts |
| `ALERT_EMAIL` | Optional | Email to receive failure notifications |
| `REDIS_URL` | Optional | Redis URL (for future queue use) |
