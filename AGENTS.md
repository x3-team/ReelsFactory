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
 - Default LLM: **`gpt-5.6-luna`** (Free/Start) — JSON-сценарии (~20/120 ₽ за 1M). Не ставить nano/haiku/flash-lite.
 - Pro/Agency LLM: **`gpt-5.6-terra`** (`AITUNNEL_LLM_MODEL_PRO`, ~20/1200 ₽ за 1M)
 - Whisper: `whisper-1` (основной AI-COGS)
- Scraping: **`APIFY_TOKEN`** — IG `apify/instagram-profile-scraper`, TikTok `clockworks/tiktok-profile-scraper` → fallback `RAPIDAPI_KEY` (только IG). На 403 hard limit — reuse последнего SUCCEEDED датасета, не mock.
- Очередь анализа: BullMQ при `REDIS_URL`, иначе in-process memory queue + polling `GET /api/analyze?id=`
- Ключи только в `.env` / секретах Cursor — **не** в `.env.example`
- Сценарии: длины **15 / 30 / 45** сек, жёсткий каркас хук→проблема→демо→CTA; цену не копировать в каждый ролик

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
