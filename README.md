# ReelsFactory

AI-powered Telegram Mini App that analyzes Instagram / TikTok profiles and generates ready-to-record reel scripts with a teleprompter. YouTube is not scraped yet.

Product requirements: [`prompts.md`](./prompts.md).

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui + Lucide
- `@telegram-apps/sdk-react`
- PostgreSQL + Prisma
- OpenAI Whisper / GPT-4o or Anthropic Claude (with local mock fallback)
- YooKassa payments + referral engine (30%)

## Setup

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL
pnpm db:generate
pnpm db:push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Without any keys the app runs a labeled demo. An AI key without a scrape key is refused (`honesty.mode=blocked`) — live LLM + silent mock profile is a lie. Explicit demo: `ALLOW_MOCK_PROFILE=true` or `MOCK_EXTERNAL_APIS=true`.

Production needs Redis (`REDIS_URL`, or `docker compose up -d redis`) and `TELEGRAM_WEBHOOK_SECRET`. Register the bot webhook with `POST /api/telegram/setup` (header `x-setup-secret`) or set `REGISTER_TELEGRAM_WEBHOOK=true`. Health: `GET /api/health`.

YooKassa notifications: `POST /api/payments/webhook` — the handler re-fetches the payment from YooKassa. You can also append `?secret=` matching `YOOKASSA_WEBHOOK_SECRET`.

## App flow

1. **Onboarding** — social handle, goal, tone, optional offer
2. **Analysis** — parse profile → transcribe top videos → generate strategy JSON
3. **Results** — audit tips, content pillars, script viewer + teleprompter
4. **Paywall** — Start 590₽ / Pro 1990₽ / Agency 4990₽ + referral `t.me/Bot?start=ref_{telegram_id}`

## API

| Route | Purpose |
| --- | --- |
| `POST /api/users` | Upsert Telegram user + capture `ref_*` start param |
| `POST /api/users/onboard` | Save onboarding preferences |
| `POST /api/parse-profile` | Scrape profile bio + top videos |
| `POST /api/transcribe` | Whisper transcription for an audio URL |
| `POST /api/generate-strategy` | LLM strategy JSON |
| `POST /api/analyze` | Queue full pipeline → `ProfileAnalysis` + scripts |
| `GET /api/analyze?id=` | Poll one analysis |
| `GET /api/analyze?userId=` | Analysis history |
| `POST /api/payments/create` | Create YooKassa (or mock) payment; referral balance as discount |
| `POST /api/payments/webhook` | YooKassa webhook → subscription + referral credit |
| `GET /api/payments/mock-complete` | Demo payment success redirect |
| `GET/POST /api/referrals/payout` | Referral cash-out request (from 500₽) |
| `POST /api/telegram/webhook` | Bot `/start ref_` + comment-keyword replies |
| `POST /api/telegram/setup` | Register Telegram webhook |
| `GET /api/health` | Postgres + Redis + `honesty` (live / demo / blocked) |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |
| `pnpm db:generate` | Prisma Client |
| `pnpm db:push` | Push schema |
| `pnpm db:migrate` | Migrations |
| `pnpm db:studio` | Prisma Studio |
| `pnpm test:honesty` | Live-LLM + mock-profile must not pass |
