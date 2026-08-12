# AGENTS.md

## Cursor Cloud specific instructions

### Communication

- Always reply to the user in **Russian** (весь диалог с пользователем — на русском).
- UI/copy of the product is also Russian; keep new user-facing strings in Russian unless explicitly asked otherwise.

### Product

ReelsFactory Telegram Mini App for CIS/RU creators. Specs:
- **Current state, code map, gaps, next steps: `docs/PROJECT_STATE.md` — read this first**
- Build phases: `prompts.md`
- Business requirements: `CONTEXT.md`

### Routes

- `/` — public marketing landing (no Telegram SDK)
- `/app` — Telegram Mini App (`TelegramProvider` in `src/app/app/layout.tsx`)
- `/legal/{offer,terms,privacy}` — legal pages from `NEXT_PUBLIC_LEGAL_*`

Inside Telegram, `/` redirects to `/app`. BotFather Mini App URL should point at `/app`.

### Business rules

- Plans: Free / Start 590₽ / Pro 1990₽ / **Agency 4990₽** (до 5 клиентских аккаунтов)
- Referral: **30%** первая оплата, **10%** продления; share под карточками сценариев
- AI: **AITunnel** (`https://api.aitunnel.ru/v1/`) — ключ `AITUNNEL_API_KEY`
  - Default LLM: **`deepseek-v4-flash`** (Free/Start) — лучший баланс цена/качество для JSON-сценариев (~18/36 ₽ за 1M)
  - Pro/Agency LLM: **`gpt-5.6-terra`** (`AITUNNEL_LLM_MODEL_PRO`, ~20/1200 ₽ за 1M)
  - Whisper: `whisper-1` (основной AI-COGS)
- Scraping Instagram: **`APIFY_TOKEN`** (актор `apify/instagram-profile-scraper`) → fallback `RAPIDAPI_KEY` → mock
- Очередь анализа: BullMQ при `REDIS_URL` (**обязателен в production**, иначе `ALLOW_MEMORY_QUEUE=true`); polling `GET /api/analyze?id=`
- Ключи только в `.env` / секретах Cursor — **не** в `.env.example`
- Сценарии: длины **15 / 30 / 45** сек, жёсткий каркас хук→проблема→демо→CTA; цену не копировать в каждый ролик

### Services

The dev environment is described by `.cursor/environment.json` in this repo, so every
agent and machine gets the same setup:

- `install` → `scripts/dev-env-install.sh` (apt packages, pnpm deps, `.env`, `prisma db push`)
- `start` → `scripts/dev-env-start.sh` (Postgres cluster, `reelsfactory` DB, Redis)
- `terminals` → `next-dev` running `pnpm dev`

| Service | Required | How to run |
| --- | --- | --- |
| PostgreSQL | Yes | `bash scripts/dev-env-start.sh`; `DATABASE_URL` in `.env` |
| Next.js | Yes | `pnpm dev` → http://localhost:3000 |
| Redis | Prod | `scripts/dev-env-start.sh` starts it locally; prod needs `REDIS_URL` |
| AITunnel / scrape / YooKassa | Optional in dev | Без ключей `isMockMode()` сам включает моки |

### Commands

- Lint / build: `pnpm lint`, `pnpm build`
- DB: `pnpm db:generate`, `pnpm db:push`
- Smoke: UI или `curl` на `/api/*`

### Gotchas

- UI и mock-стратегия на русском (`lang="ru"`).
- Package manager **pnpm**; `allowBuilds` в `pnpm-workspace.yaml`.
- Вне Telegram клиент хранит `localStorage` telegram id; `initData` валидируется на сервере при `TELEGRAM_BOT_TOKEN`.
- Не коммитить `.env`.

### Unit economics (AITunnel, зафиксировано 11.08.2026)

Реальный прогон анализа `@desertmsk` (проект ReelsFactory в AITunnel):

| Вызов | Стоимость |
| --- | --- |
| `whisper-1` × 5 | 0.26 + 0.30 + 0.44 + 0.22 + 0.30 = **1.52₽** |
| `gpt-4o-mini` × 1 (стратегия/сценарии) | **0.15₽** |
| **Итого AI на 1 анализ** | **≈ 1.67₽** |

Доля: Whisper ≈ **91%** стоимости AI, LLM ≈ **9%**.

Ожидание после лимита топ‑3 рилсов на Whisper: ≈ **1.0–1.2₽** AI / анализ (без учёта Apify).

Сверка с тарифами (только AITunnel, без Apify/инфры):

| План | Цена | Сценарии/мес | Анализов* | AI COGS* | Доля от цены |
| --- | --- | --- | --- | --- | --- |
| FREE | 0₽ | 1 тизер | 1 | ~1.7₽ | loss-leader |
| START | 590₽ | 12 | ~4 | ~7₽ | ~1% |
| PRO | 1990₽ | 30 | ~10 | ~17₽ | ~1% |
| AGENCY | 4990₽ | 100 | ~33 | ~55₽ | ~1% |

\*1 анализ сейчас даёт до 3 сценариев; COGS при ~1.67₽/анализ.

**Вывод:** AI-экономика сходится с запасом. Главный AI-расход — Whisper; LLM на mini почти копеечный. В полную себестоимость ещё закладывать **Apify** (отдельно от этого скрина).
