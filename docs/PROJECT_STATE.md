# ReelsFactory — состояние проекта

Единая точка входа в контекст: что построено, как это запустить и что осталось.
Документ живёт в репозитории специально — чтобы любой чат или новый разработчик
получал полную картину без истории переписки.

Обновлён: 12.08.2026 · ветка `cursor/cis-content-bomb-features-fc8c` ·
PR [#6](https://github.com/x3-team/reelsfactory/pull/6)

Смежные документы: `AGENTS.md` (правила и бизнес-константы), `CONTEXT.md`
(требования к продукту), `prompts.md` (фазы сборки).

---

## 1. Что это за продукт

Telegram Mini App для авторов и экспертов РФ/СНГ. Пользователь отдаёт `@ник`
в Instagram или TikTok, сервис разбирает профиль и его залетевшие ролики и выдаёт
готовые сценарии с суфлёром по жёсткому каркасу **хук → проблема → демо → CTA**,
сразу упакованные под Reels, VK Клипы и Telegram.

Ключевое отличие от «ИИ пишет сценарии»: текст строится на данных конкретного
аккаунта (скрейп профиля + расшифровка его же роликов), а не на общем промпте.

## 2. Точки входа

| Роут | Что это |
| --- | --- |
| `/` | Публичный маркетинговый лендинг (статика, без Telegram SDK) |
| `/app` | Mini App. `TelegramProvider` и жёсткий viewport — в `src/app/app/layout.tsx` |
| `/legal/offer`, `/legal/terms`, `/legal/privacy` | Юридические страницы для проверки YooKassa |
| `/api/*` | 18 роутов, см. раздел 4 |

Открытый внутри Telegram `/` видит `Telegram.WebApp.initData` и заменяет location
на `/app`, поэтому старые ссылки не ломаются. В BotFather URL Mini App лучше
указывать `/app` напрямую.

## 3. Стек

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind + shadcn/ui ·
Prisma + PostgreSQL 16 · BullMQ + Redis · pnpm.

Шрифты: Geist (локально) + Unbounded (`font-display`). Тема — тёмная «студия»:
тёплый чёрный `hsl(20 14% 6%)`, коралловый акцент `hsl(12 86% 56%)`.

## 4. Карта кода

```
src/app/                 роуты (лендинг, /app, /legal, /api)
src/components/
  landing/               маркетинговый лендинг
  app/                   каркас Mini App
  onboarding/            4 шага онбординга
  results/               табы результата: Сценарии / Съёмка / Стратегия / Студия
  paywall/               bottom sheet тарифов
  agency/                клиентские аккаунты Agency
  telegram/              провайдер и хуки Telegram
  brand/, ui/            логотип и примитивы shadcn
src/lib/
  ai/                    AITunnel: LLM + Whisper
  scraping/              Apify → RapidAPI → mock
  pipeline/              оркестрация анализа
  queue/                 BullMQ, при отсутствии Redis — in-process
  payments/              YooKassa
  telegram/              initData HMAC, бот, webhook
  quota-lock.ts          атомарные квоты (UsageCounter)
  rate-limit.ts          лимиты на мутирующие роуты
  usage.ts, cost-meter.ts учёт квот и AI-затрат
  config.ts              PLANS, ставки рефералки, isMockMode()
  legal.ts               реквизиты из NEXT_PUBLIC_LEGAL_*
prisma/schema.prisma     15 моделей
scripts/dev-env-*.sh     установка и запуск dev-окружения
```

API: `analyze`, `parse-profile`, `generate-strategy`, `transcribe`, `remake`,
`autopsy`, `hooks/feedback`, `users`, `users/onboard`, `clients`,
`reports/agency`, `payments/create`, `payments/webhook`,
`payments/mock-complete`, `referrals/payout`, `telegram/webhook`,
`telegram/setup`, `health`.

Модели Prisma: `User`, `ClientAccount`, `ProfileAnalysis`, `Script`,
`WhisperCache`, `ScrapeCache`, `CostEvent`, `HookFeedback`, `Payment`,
`Referral`, `UsageCounter`, `BotSession`, `ReferralPayout`.

## 5. Бизнес-правила

Тарифы: Free · Старт 590₽ · Про 1990₽ · Агентство 4990₽ (до 5 клиентских
аккаунтов). Источник истины — `PLANS` в `src/lib/config.ts`; лендинг и пейволл
рендерятся из него, поэтому цены не могут разойтись.

Рефералка: 30% с первой оплаты, 10% с продлений. Баланс работает как скидка при
оплате; при полном покрытии YooKassa не вызывается. Вывод — заявка от 500₽,
подтверждается вручную.

AI (AITunnel, `https://api.aitunnel.ru/v1/`): `deepseek-v4-flash` для Free/Start,
`gpt-5.6-terra` для Pro/Agency, `whisper-1` для расшифровки. Whisper — около 90%
себестоимости AI; один анализ ≈ 1.0–1.7₽ без учёта Apify.

Скрейпинг: Apify (`apify/instagram-profile-scraper`,
`clockworks/tiktok-profile-scraper`) → fallback RapidAPI → mock. YouTube пока mock.

Сценарии: длины 15 / 30 / 45 секунд, цену не дублируем в каждый ролик.

## 6. Как запустить

В Cloud Agent всё поднимается само: `.cursor/environment.json` вызывает
`scripts/dev-env-install.sh` (пакеты, зависимости, `.env`, схема) и
`scripts/dev-env-start.sh` (Postgres, Redis), а `pnpm dev` живёт в терминале
`next-dev`.

Вручную:

```bash
bash scripts/dev-env-install.sh   # один раз
bash scripts/dev-env-start.sh     # после каждой перезагрузки машины
pnpm dev                          # http://localhost:3000
```

Проверки: `pnpm lint`, `pnpm build`, `curl localhost:3000/api/health`.
Схема: `pnpm db:push`, клиент — `pnpm db:generate`.

Ключей нет — `isMockMode()` сам включает демо-ответы, приложение работает
целиком. Добавили `AITUNNEL_API_KEY` — пошли реальные вызовы.

## 7. Переменные окружения

`.env` создаётся install-скриптом и содержит только локальную инфраструктуру:
`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`,
`REDIS_URL`, `REQUIRE_TELEGRAM_AUTH`. Полный список — в `.env.example`.

Секреты (Cursor Cloud → Secrets или локальный `.env`, **не** в git):
`AITUNNEL_API_KEY`, `APIFY_TOKEN`, `RAPIDAPI_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_WEBHOOK_SECRET`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`,
`YOOKASSA_WEBHOOK_SECRET`.

Публичные, но обязательные перед проверкой YooKassa: `NEXT_PUBLIC_LEGAL_NAME`,
`NEXT_PUBLIC_LEGAL_INN`, `NEXT_PUBLIC_LEGAL_OGRNIP`,
`NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_SUPPORT_EMAIL` — иначе в футере
заглушки вместо реквизитов.

## 8. Что сделано

**Продукт.** Онбординг из 4 шагов с пресетами ниш. Анализ профиля с очередью и
возвратом к незавершённому прогону. Результат в табах: Сценарии (первым),
Съёмка, Стратегия, Студия. Кросс-пакет под Reels / VK Клипы / Shorts / Telegram.
Съёмочный день одним образом, календарь на 7 дней, воронка «слово в комментарий
→ бот отдаёт лидмагнит». Ремейк чужого вируса и разбор «почему не залетело»
(Pro/Agency). A/B хуков через «Залетело». Agency: до 5 клиентов и недельный
отчёт. Суфлёр со скоростью, размером и зеркалом. История анализов.

**Экономика и безопасность.** Flash на стратегию, Terra только в студии. Кэши
Whisper и скрейпа, месячный лимит Apify. `initData` проверяется на мутирующих
роутах, GET анализа ограничен владельцем. Мок-платежи не могут закрыть живой
YooKassa. В production Redis обязателен (`ALLOW_MEMORY_QUEUE=true` — только
аварийно). Квоты атомарные через `UsageCounter`. Рейт-лимиты на анализ, ремейк,
разбор, платежи, выплаты и бота. `commentKeyword` уникален между авторами.
Webhook YooKassa перезапрашивает платёж через API.

**Маркетинг.** Лендинг с оффером «Снял раз — выложи в Reels, VK и Telegram»,
реальными скриншотами продукта, блоком отличий от ChatGPT, ценами из `PLANS`,
FAQ на шесть возражений, липким CTA на мобиле и юридическим футером.

## 9. Что не сделано

- YouTube-скрейпинг — заглушка, живёт только Instagram и TikTok.
- Выплаты рефералки — заявка `PENDING`, ручное подтверждение, без автовыплат.
- Автотестов нет: проверка только `pnpm lint`, `pnpm build` и прогон по UI.
- Отзывов и кейсов с цифрами на лендинге нет сознательно — до первых реальных
  авторов. Это самая сильная точка роста конверсии.
- `NEXT_PUBLIC_LEGAL_*` не заполнены.
- Вебхук бота нужно зарегистрировать после деплоя:
  `curl -X POST "$APP_URL/api/telegram/setup" -H "x-setup-secret: $TELEGRAM_WEBHOOK_SECRET"`.

## 10. Куда двигаться

1. Заполнить реквизиты и пройти проверку YooKassa — без этого нет выручки.
2. Прогнать 5–10 живых авторов, снять реальные цифры и поставить кейсы на лендинг.
3. YouTube Shorts в скрейпинг: сейчас это единственная площадка на моках.
4. Автовыплаты рефералки, когда появится поток заявок.
5. Тесты на квоты, рейт-лимиты и вебхуки — самая рискованная логика без покрытия.
