# AGENTS.md

## Cursor Cloud specific instructions

### Product

ReelsFactory is a Telegram Mini App (Next.js 14 App Router). Spec: `prompts.md`.

### Services

| Service | Required | How to run |
| --- | --- | --- |
| Next.js app | Yes | `pnpm dev` (port 3000) |
| PostgreSQL | Required for DB features / migrate | Provide `DATABASE_URL` in `.env` (see `.env.example`). Prisma Client generate works without a live DB. |

### Commands

- Lint: `pnpm lint`
- Tests: none yet (Phase 1)
- Build: `pnpm build` (runs fine without a live Postgres if client is generated)
- Prisma client: `pnpm db:generate` (also via `postinstall`)
- Schema push / migrate: `pnpm db:push` / `pnpm db:migrate` — needs a reachable `DATABASE_URL`

### Gotchas

- Package manager is **pnpm**. Build scripts allowlist lives in `pnpm-workspace.yaml` (`allowBuilds`), not `package.json`.
- Telegram SDK must only be initialized in client components (`TelegramProvider`). Outside Telegram WebView, init failures are swallowed so browser `pnpm dev` still works.
- Referral start param format: `ref_{telegram_id}` via `t.me/ReelsFactoryBot?start=ref_{telegram_id}`.
- Do not commit `.env`; use `.env.example`.
