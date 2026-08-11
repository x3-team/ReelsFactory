# ReelsFactory

AI-powered Telegram Mini App that analyzes Instagram / TikTok / YouTube profiles and generates ready-to-record reel scripts with a teleprompter.

Product requirements live in [`prompts.md`](./prompts.md).

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui + Lucide
- `@telegram-apps/sdk-react` (Mini App viewport, theme, BackButton)
- PostgreSQL + Prisma ORM

## Setup

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL
pnpm db:generate
pnpm db:push           # or pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Outside Telegram the app runs in browser-dev mode; open via your bot for full Mini App APIs.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next.js development server |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:push` | Push schema to PostgreSQL |
| `pnpm db:migrate` | Create/apply migrations |
| `pnpm db:studio` | Prisma Studio |

## Phase status

- **Phase 1 (current):** Next.js foundation, Prisma models, Tailwind + shadcn/ui, Telegram provider
- **Phase 2:** API routes (parse / transcribe / generate / payments webhook)
- **Phase 3:** Onboarding, analysis progress, results + teleprompter, paywall
