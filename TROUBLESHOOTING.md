# Troubleshooting Selixes

If you encounter issues during the 1-click installation or while running the gateway, check the common solutions below.

## 1. Database Port Conflict (5432 is already in use)
**Error:** `Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use`

**Cause:** You already have PostgreSQL running natively on your machine or in another Docker container.

**Solution:**
Stop your local Postgres instance, or kill the process using port 5432:
* **Mac/Linux:** `sudo lsof -i :5432` then `kill -9 <PID>`
* **Windows:** `Stop-Service -Name postgresql-x64-15` (or similar).

## 2. Prisma: "Authentication failed against database"
**Error:** `P1000: Authentication failed against database server at postgres:5432`

**Cause:** The `.env` file credentials do not match the Docker container initialization credentials (usually happens if you changed `.env` after running Docker for the first time).

**Solution:**
Clear the Docker volumes and recreate the database:
```bash
docker-compose down -v
docker-compose up -d postgres redis
npx prisma db push --schema=packages/database/prisma/schema.prisma
```

## 3. Web Dashboard shows "Missing Clerk Keys"
**Error:** Next.js throws an error about missing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

**Cause:** The application requires Clerk for the admin dashboard.

**Solution:**
1. Go to [Clerk.com](https://clerk.com) and create a free application.
2. Open your `.env` file and paste the Publishable and Secret keys.
3. Restart the server (`Ctrl+C` and run `./start.sh` again).

## 4. Node Version Errors
**Error:** `Unsupported engine` or syntax errors during `npm install`.

**Cause:** Selixes requires Node.js v18 or higher.

**Solution:**
Upgrade Node.js. We recommend using `nvm` (Node Version Manager):
```bash
nvm install 18
nvm use 18
npm install
```

---
*Still stuck? Open an issue on GitHub and we'll help you get unblocked!*
