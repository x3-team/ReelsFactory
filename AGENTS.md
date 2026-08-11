# AGENTS.md

## Cursor Cloud specific instructions

### Communication

- Always reply to the user in **Russian** (весь диалог с пользователем — на русском).
- UI/copy of the product is also Russian; keep new user-facing strings in Russian unless explicitly asked otherwise.

### Product

ReelsFactory Telegram Mini App for CIS/RU creators. Specs:
- Build phases: `prompts.md`
- Business requirements (pricing, referral %, Agency plan, queues): `CONTEXT.md`

Phases 1–3 MVP are implemented on Next.js API routes (no NestJS/BullMQ yet).

### Business rules (from CONTEXT.md)

- Plans: Free / Start 590₽ / Pro 1990₽ / **Agency 4990₽** (до 5 аккаунтов)
- Referral: **30%** с первой оплаты, **10%** с продлений; share-кнопка под карточками сценариев
- Unit cost ориентир: ~10–12₽ за полный цикл генерации
- Очереди: BullMQ + Redis (пока анализ синхронный в `/api/analyze`)

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
