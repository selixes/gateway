#!/bin/bash

# =========================================================================
# Selixes: 1-Click Developer Onboarding (Linux/macOS)
# =========================================================================

echo "🚀 Starting Selixes Developer Onboarding Setup..."
echo ""

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    echo "Please install Docker Desktop and try again."
    exit 1
fi

# 2. Check/Copy Environment Variables
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Bootstrapping from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file."
    echo "   (Note: You will need to add your real OpenAI and Clerk keys later)"
else
    echo "✅ .env file found."
fi

# 3. Boot Database & Cache
echo "📦 Booting PostgreSQL and Redis via Docker..."
docker-compose up -d postgres redis

# 4. Install Dependencies
echo "📥 Installing Node.js dependencies (this may take a minute)..."
npm install

# 5. Hydrate Database
echo "🗄️  Applying database schema and mock seed data..."
npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss
npx ts-node packages/database/seed.ts

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Booting Selixes in Development Mode..."
echo "  - Telemetry Dashboard: http://localhost:3000"
echo "  - API Gateway Engine:  http://localhost:4000"
echo ""

# 6. Start Turborepo Dev
npm run dev
