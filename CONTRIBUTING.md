# Contributing to Selixes AI Gateway

Thank you for your interest in contributing to Selixes! We welcome community contributions, bug reports, documentation improvements, and architectural reviews.

---

## Code of Conduct & Core Principles

1. **Grounded Systems Claims:** Every performance claim, latency metric, and architectural statement must be backed by a reproducible benchmark or test suite in the repository.
2. **Zero Secrets Policy:** Never commit secrets, real API keys, credentials, or private data. All configurations must use `.env` placeholders.
3. **Tested Regressions:** Any bug fix or new feature must include a corresponding unit or e2e test suite in `apps/api/src/`.

---

## Local Development Setup

### 1. Prerequisites
- **Node.js:** v22+ (`node --version`)
- **Docker & Docker Compose:** For running local PostgreSQL and Redis services
- **npm:** v9+

### 2. Clone & Install
```bash
git clone https://github.com/selixes/gateway.git
cd gateway
cp .env.example .env
npm install
```

### 3. Start Local Infrastructure
```bash
# Starts local PostgreSQL (port 5432) and Redis (port 6379)
docker compose up -d postgres redis
```

### 4. Push Database Schema
```bash
cd packages/database
npx prisma db push
cd ../..
```

### 5. Run the Gateway
```bash
# Terminal 1: Run NestJS API (Port 4000)
cd apps/api
npm run start:dev

# Terminal 2: Run Web Dashboard (Port 3000)
cd apps/web
npm run dev
```

---

## Verification & Test Commands

Before opening a pull request, verify that compilation and all test suites pass cleanly:

```bash
# 1. Typecheck & Build the API
cd apps/api
npx nest build

# 2. Run the Full Unit Test Suite (Jest)
npm test

# 3. Typecheck Web Dashboard
cd ../web
npm run build
```

---

## Pull Request Guidelines

1. **Branch Naming:** Create a focused branch from `main`:
   - `feat/feature-name`
   - `fix/bug-description`
   - `docs/clarification`
2. **Commit Conventions:** Follow Conventional Commits:
   - `feat(gateway): implement adaptive stall timeout`
   - `fix(security): prevent secret reflection in error filter`
   - `docs(readme): clarify stream splicing architecture`
3. **Zero Secrets Scan:** Run `gitleaks` locally before opening your PR:
   ```bash
   gitleaks git --log-opts="origin/main..HEAD"
   ```
4. **Open PR:** Submit your pull request against `main` on GitHub. Include a clear description of the problem, the architectural layer where it is solved, and test verification output.

---

## Reporting Vulnerabilities

Please do NOT report security vulnerabilities via public GitHub issues. Refer to [SECURITY.md](./SECURITY.md) for our coordinated vulnerability disclosure process.

---

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
