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
- AI: **AITunnel** (`https://api.aitunnel.ru/v1/`) — ключ `AITUNNEL_API_KEY`
  - Default LLM: **`gemini-3.5-flash-lite`** (Free/Start)
  - Pro/Agency LLM: **`gpt-5.6-terra`** (`AITUNNEL_LLM_MODEL_PRO`)
  - Whisper: **только paid** — START топ‑3, PRO/AGENCY топ‑5 (по views, с `audioUrl`, приоритет роликам ≥12с). FREE = captions. Kill-switch: `ENABLE_WHISPER=false`
- Scraping Instagram: **`APIFY_TOKEN`** (`resultsLimit` default **24** публикаций сетки → фильтр видео → топ по views) → fallback `RAPIDAPI_KEY` → mock
- Очередь анализа: BullMQ при `REDIS_URL`, иначе in-process memory queue + polling `GET /api/analyze?id=`
- Ключи только в `.env` / секретах Cursor — **не** в `.env.example`
- Сценарии: длины **15 / 30 / 45** сек; жёсткий каркас хук→проблема→демо→CTA
- Ожидаемое время анализа без Whisper: **~40–60 сек** (Apify + LLM)

### Services

| Service | Required | How to run |
| --- | --- | --- |
| PostgreSQL | Yes | `sudo pg_ctlcluster 16 main start`; `DATABASE_URL` in `.env` |
| Next.js | Yes | `pnpm dev` → лендинг `/`, мини-апп `/app` |
| Redis | Optional | Set `REDIS_URL` for BullMQ; иначе memory queue |
| AITunnel / scrape / YooKassa | Optional in dev | Без ключей — `MOCK_EXTERNAL_APIS` |

### Commands

- Lint / build: `pnpm lint`, `pnpm build`
- DB: `pnpm db:generate`, `pnpm db:push`
- Smoke: UI или `curl` на `/api/*`

### Gotchas

- UI и mock-стратегия на русском (`lang="ru"`).
- Публичный лендинг: `/`. Telegram Mini App и продукт: `/app` (из TG на `/` редирект на `/app`).
- Юридические страницы: `/legal/offer`, `/legal/terms`, `/legal/privacy`. Реквизиты — `NEXT_PUBLIC_LEGAL_*` и `NEXT_PUBLIC_SUPPORT_EMAIL` в `.env`. Если не заданы — в футере плейсхолдеры (можно деплоить без них в dev; перед продом лучше заполнить).
- Package manager **pnpm**; `allowBuilds` в `pnpm-workspace.yaml`.
- Версия сервиса: `package.json` → `version` (сейчас показывается в UI как `vX.Y.Z`, также `GET /api/version`).
- Платформы: **Instagram и TikTok** (YouTube не поддерживаем — явный отказ в `detectPlatform` / онбординге).
- Разовый продукт: **SCRIPT_PACK** 390₽ («Ещё 3 сценария») без подписки.
- Агентство: печатный HTML‑отчёт для клиента из результатов разбора.
- Вне Telegram клиент хранит `localStorage` telegram id; `initData` валидируется на сервере при `TELEGRAM_BOT_TOKEN`.
- Не коммитить `.env`.

### Unit economics (AITunnel, зафиксировано 11.08.2026)

Реальный прогон с Whisper ×5 + gpt-4o-mini ≈ **1.67₽** (Whisper ~91%).

Текущая политика:
- **FREE** — без Whisper (captions), быстро/дёшево  
- **START** — Whisper ×3 топ‑рилсов  
- **PRO/AGENCY** — Whisper ×5 + более сильная LLM  

Kill-switch: `ENABLE_WHISPER=false`.
