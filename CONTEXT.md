# ReelsFactory — Context & Business Requirements

## Project Goal

Build a high-margin SaaS Telegram Mini App (TMA) for creators, experts, and SMM managers in the CIS / RU market.

The service analyzes Instagram/TikTok/YouTube profiles, extracts viral patterns from past top-performing videos (via OCR/transcription), identifies content pillars, and generates ready-to-record video scripts formatted for a teleprompter view.

## Core Features

1. **Onboarding Flow:** Single/Multi-step form collecting `@username`, goals (Audience Growth vs Sales), website URL/offer, and Tone of Voice.
2. **Analysis Pipeline:**
   - Fetch Bio, stats, and top 5 most viewed Reels/Videos using Scraping API (Apify/RapidAPI via proxies).
   - Transcribe top 5 videos via OpenAI Whisper API.
   - Run Claude 3.5 Sonnet / GPT-4o to identify Niche, Target Audience, Content Pillars, and Profile Audit recommendations.
3. **Script Generator:** Generates structured scripts with multiple catchy 0-3s Hook options, step-by-step teleprompter text, captions, and CTA.
4. **Referral Engine (Virality):**
   - Direct integration with Telegram bot deep links (`t.me/Bot?start=ref_ID`).
   - 30% payout/credit on first payment, 10% recurring on renewals.
   - Referral share buttons embedded directly under generated script cards.

## Pricing & Economics

- **Unit Costs:** ~10-12 RUB per full generation cycle (Scraping + Whisper + LLM).
- **Free Demo:** Profile audit + 1 full script with teleprompter.
- **Start Plan (Mass Market):** 590 RUB / month (12 scripts, teleprompter, content themes).
- **Pro Plan (Expert):** 1,990 RUB / month (30 scripts, competitor analysis, Telegram post adaptation).
- **Agency Plan:** 4,990 RUB / month (up to 5 client accounts).

## Primary Tech Stack

- Frontend: Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, `@telegram-apps/sdk-react`.
- Backend: Node.js (Next.js API routes), PostgreSQL + Prisma ORM (Supabase/Selectel), BullMQ (Redis) for queues (in-process fallback without Redis).
- AI: **AITunnel** (`https://api.aitunnel.ru/v1/`) as OpenAI-compatible gateway to GPT / Claude / Whisper and others; Apify/RapidAPI for scraping.
- Payments: YoKassa / CloudPayments API + internal balance & referral tracking.

## Notes for agents

- Product UI and agent↔user chat: **Russian**.
- Spec for Composer phases also lives in `prompts.md` (MVP build steps). Prefer this file for business rules when they diverge.
