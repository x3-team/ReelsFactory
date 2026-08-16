# ReelsFactory

AI-powered Telegram Mini App that analyzes Instagram / TikTok / YouTube profiles and generates ready-to-record reel scripts with a teleprompter.

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

With `MOCK_EXTERNAL_APIS=true` (default when AI keys are missing), scraping / Whisper / LLM / YooKassa use realistic demo responses so the full flow works offline.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Маркетинговый лендинг (русский, статика). Внутри Telegram сразу уводит на `/app`, сохраняя `tgWebAppData` |
| `/app` | Mini App: онбординг → анализ → результаты → суфлёр. Принимает `?handle=` с лендинга и `?paid=1` после оплаты |

Дизайн-аудит текущего UI и решения по витрине: [`docs/DESIGN_AUDIT.md`](./docs/DESIGN_AUDIT.md).
Шрифты (Onest + Unbounded, сабсет с кириллицей) лежат в [`src/app/fonts`](./src/app/fonts).

## App flow

1. **Onboarding** — social handle, goal, tone, optional offer
2. **Analysis** — parse profile → transcribe top videos → generate strategy JSON
3. **Results** — audit tips, content pillars, script viewer + teleprompter
4. **Paywall** — Start 590₽ / Pro 1990₽ + copy referral link `t.me/Bot?start=ref_{telegram_id}`

## API

| Route | Purpose |
| --- | --- |
| `POST /api/users` | Upsert Telegram user + capture `ref_*` start param |
| `POST /api/users/onboard` | Save onboarding preferences |
| `POST /api/parse-profile` | Scrape profile bio + top videos |
| `POST /api/transcribe` | Whisper transcription for an audio URL |
| `POST /api/generate-strategy` | LLM strategy JSON |
| `POST /api/analyze` | Full pipeline → persists `ProfileAnalysis` + `Script`s |
| `POST /api/payments/create` | Create YooKassa (or mock) payment |
| `POST /api/payments/webhook` | YooKassa webhook → subscription + 30% referral credit |
| `GET /api/payments/mock-complete` | Demo payment success redirect |

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
