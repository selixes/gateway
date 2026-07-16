# =========================================================================
# Selixes: 1-Click Developer Onboarding (Windows PowerShell)
# =========================================================================

Write-Host "🚀 Starting Selixes Developer Onboarding Setup..." -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Docker is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# 2. Check/Copy Environment Variables
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found. Bootstrapping from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" -Destination ".env"
    Write-Host "✅ Created .env file." -ForegroundColor Green
    Write-Host "   (Note: You will need to add your real OpenAI and Clerk keys later)" -ForegroundColor DarkGray
} else {
    Write-Host "✅ .env file found." -ForegroundColor Green
}

# 3. Boot Database & Cache
Write-Host "📦 Booting PostgreSQL and Redis via Docker..." -ForegroundColor Cyan
docker-compose up -d postgres redis

# 4. Install Dependencies
Write-Host "📥 Installing Node.js dependencies (this may take a minute)..." -ForegroundColor Cyan
npm install

# 5. Hydrate Database
Write-Host "🗄️  Applying database schema and mock seed data..." -ForegroundColor Cyan
npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss
npx ts-node packages/database/seed.ts

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Booting Selixes in Development Mode..." -ForegroundColor Cyan
Write-Host "  - Telemetry Dashboard: http://localhost:3000"
Write-Host "  - API Gateway Engine:  http://localhost:4000"
Write-Host ""

# 6. Start Turborepo Dev
npm run dev
