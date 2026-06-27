# Contributing to Selixes

Thank you for your interest in contributing! Selixes is an open-source project and we welcome contributions of all kinds.

---

## Ways to Contribute

- **Bug Reports** — Found something broken? Open an issue with steps to reproduce.
- **Feature Requests** — Have an idea? Open an issue describing the use case.
- **Code Contributions** — See the workflow below.
- **Documentation** — Typos, clarifications, and new guides are always welcome.
- **Hardening Scripts** — New `verify_*.js` scripts that test deployment correctness are especially valued.

---

## Development Setup

```bash
git clone https://github.com/your-org/selixes.git
cd selixes
cp .env.example apps/api/.env
docker compose up -d        # starts postgres + redis
npm install
cd packages/database && npx prisma db push && cd ../..
cd apps/api && npm run start:dev    # terminal 1
cd apps/web && npm run dev          # terminal 2
```

Open `http://localhost:3000` to view the dashboard.

---

## Pull Request Workflow

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes.
3. Run the type checker: `npm run check-types`
4. Run the hardening verify scripts to confirm nothing regressed:
   ```bash
   node verify_agent_protection.js
   node verify_resiliency_hardened.js
   ```
5. Commit your changes: `git commit -m "feat: your description"`
6. Push and open a pull request against `main`.

---

## Code Style

- TypeScript strict mode throughout.
- NestJS conventions for API code in `apps/api/`.
- Next.js App Router conventions for web code in `apps/web/`.
- No secrets or API keys in any committed file — use `.env` (gitignored).

---

## Security Vulnerabilities

Please **do not** open a public GitHub issue for security vulnerabilities.
Email [support@selixes.com](mailto:support@selixes.com) directly with details.

---

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
