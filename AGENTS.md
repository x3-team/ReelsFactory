# AGENTS.md

## Cursor Cloud specific instructions

### Communication

- Always reply to the user in **Russian** (весь диалог с пользователем — на русском).
- UI/copy of the product is also Russian; keep new user-facing strings in Russian unless explicitly asked otherwise.

### Product

ReelsFactory Telegram Mini App for CIS/RU creators. Specs:
- Build phases: `prompts.md`
- Business requirements: `CONTEXT.md`

### Business rules

- Plans: Free / Start 590₽ / Pro 1990₽ / **Agency 4990₽** (до 5 клиентских аккаунтов)
- Referral: **30%** первая оплата, **10%** продления; share под карточками сценариев
- AI: **AITunnel** (`https://api.aitunnel.ru/v1/`) — единый ключ `AITUNNEL_API_KEY`; дефолт LLM `gpt-4o-mini` (`AITUNNEL_LLM_MODEL`)
- Очередь анализа: BullMQ при `REDIS_URL`, иначе in-process memory queue + polling `GET /api/analyze?id=`

### Services

| Service | Required | How to run |
| --- | --- | --- |
| PostgreSQL | Yes | `sudo pg_ctlcluster 16 main start`; `DATABASE_URL` in `.env` |
| Next.js | Yes | `pnpm dev` → http://localhost:3000 |
| Redis | Optional | Set `REDIS_URL` for BullMQ; иначе memory queue |
| AITunnel / scrape / YooKassa | Optional in dev | Без ключей — `MOCK_EXTERNAL_APIS` |

### Commands

- Lint / build: `pnpm lint`, `pnpm build`
- DB: `pnpm db:generate`, `pnpm db:push`
- Smoke: UI или `curl` на `/api/*`

### Gotchas

- UI и mock-стратегия на русском (`lang="ru"`).
- Package manager **pnpm**; `allowBuilds` в `pnpm-workspace.yaml`.
- Вне Telegram клиент хранит `localStorage` telegram id; `initData` валидируется на сервере при `TELEGRAM_BOT_TOKEN`.
- Не коммитить `.env`.
