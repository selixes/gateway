# AKRA FlowOps — Deployment Guide

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
# Database
POSTGRES_USER=flowops
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=flowops

# Clerk (from https://clerk.com → API Keys)
CLERK_SECRET_KEY=sk_live_xxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxx
CLERK_WEBHOOK_SECRET=whsec_xxxx

# App URL (your domain)
APP_URL=https://flowops.yourdomain.com
API_URL=https://api.flowops.yourdomain.com

# Alerts (optional — leave blank to disable)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
RESEND_API_KEY=re_xxxx
ALERT_EMAIL=alerts@yourdomain.com
```

---

## 2. Apply Database Schema

```bash
# Start only the database first
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for postgres to be healthy, then push schema
docker run --rm --network flowops_flowops \
  -e DATABASE_URL=postgresql://flowops:<password>@postgres:5432/flowops \
  -v $(pwd)/packages/database:/app \
  -w /app node:20-alpine \
  sh -c "npm i && npx prisma db push"
```

---

## 3. Start the Platform

```bash
docker compose -f docker-compose.prod.yml up -d
```

Check health:
```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:4000/health
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
