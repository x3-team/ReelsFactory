# AGENTS.md

## Cursor Cloud specific instructions

### Communication

- Always reply to the user in **Russian** (весь диалог с пользователем — на русском).
- UI/copy of the product is also Russian; keep new user-facing strings in Russian unless explicitly asked otherwise.

### Product

ReelsFactory Telegram Mini App. Spec: `prompts.md`. Phases 1–3 are implemented.

### Services

| Service | Required | How to run |
| --- | --- | --- |
| PostgreSQL | Yes for app data / analyze / payments | Local `postgresql://reels:reels@localhost:5432/reelsfactory` (see `.env.example`). Start with `sudo pg_ctlcluster 16 main start` if needed. |
| Next.js | Yes | `pnpm dev` → http://localhost:3000 |
| External AI / scrape / YooKassa | Optional | When keys are absent, `MOCK_EXTERNAL_APIS` auto-enables demo responses. |

### Commands

- Lint / build: `pnpm lint`, `pnpm build`
- DB: `pnpm db:generate`, `pnpm db:push`
- No automated test suite yet; smoke via UI or `curl` against `/api/*`

### Gotchas
- UI and mock strategy content are **Russian** (`lang="ru"`). LLM system prompt asks for Russian JSON.

- Package manager is **pnpm**. Allowed build scripts live in `pnpm-workspace.yaml` (`allowBuilds`).
- Outside Telegram WebView the client invents a stable `localStorage` telegram id (`reelsfactory.devTelegramId`) so browser demos work.
- Analysis UI waits ≥4.5s so the progress steps remain visible even when mocks return instantly.
- Mock payments redirect through `/api/payments/mock-complete?paymentId=...` then `/?paid=1`.
- Referral start param: `ref_{telegram_id}` → 30% of paid amount credited to referrer on webhook success.
- Do not commit `.env`.
