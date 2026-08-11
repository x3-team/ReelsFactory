# Product Requirements Document (PRD): ReelsFactory MVP (Telegram Mini App)

## Overview

ReelsFactory is an AI-powered Telegram Mini App (TMA) for content creators, SMM managers, and experts. 

It analyzes Instagram/TikTok/YouTube profiles, extracts viral hooks from past top videos, identifies content pillars, and generates ready-to-record video scripts with a built-in teleprompter layout.

---

## Technical Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling & UI:** Tailwind CSS, shadcn/ui, Lucide Icons
- **Telegram Integration:** `@telegram-apps/sdk-react` (Telegram Mini Apps WebApp wrapper)
- **Database & ORM:** PostgreSQL + Prisma ORM (Deployed on Supabase or Selectel)
- **AI Engine:**
  - **Scraping:** RapidAPI / Apify (Instagram profile & video metadata fetch)
  - **Speech-to-Text:** OpenAI Whisper API `whisper-1`)
  - **Analytics & Generation:** Anthropic Claude 3.5 Sonnet API or OpenAI GPT-4o
- **Payments:** YoKassa / CloudPayments API + Referral tracking engine

---



## Core System Architecture & Workflow



### Step 1: User Onboarding (Telegram Mini App)

1. Read Telegram User Data via `window.Telegram.WebApp.initDataUnsafe`.
2. Form fields:
  - Instagram / TikTok `@username` or YouTube Channel link.
  - Profile Goal: `Grow Audience` or `Sell Product/Service`.
  - Optional: Website URL or offer summary.
  - Tone of Voice selection `Direct`, `Humorous`, `Expert`, `Storytelling`).



### Step 2: Ingestion & Analysis Pipeline

1. Fetch Profile Bio, followers, and top 5 most viewed videos via Scraping API.
2. Download audio tracks of top 5 videos and transcribe via OpenAI Whisper API.
3. Pass extracted Bio + Transcriptions + User Goal into LLM with a strict JSON Schema prompt.



### Step 3: LLM JSON Output Requirements

The LLM must return a structured JSON:

```json

{

  "niche": "Dessert Making and Education",

  "target_audience": "Home bakers and dessert lovers",

  "content_pillars": [

    {"title": "Zefir Secrets", "description": "Technique and temperature tips"},

    {"title": "Bento Cakes", "description": "Quick assembly and decor"}

  ],

  "profile_audit_tips": [

    "Make your bio offer explicit: Mention what people get by subscribing.",

    "Repeat your top-performing video about zephir temperature."

  ],

  "scripts": [

    {

      "title": "Why homemade zefir fails",

      "format": "Reels / Shorts (15 sec)",

      "hook_options": [

        "Stop blaming the agar-agar, you are making this error...",

        "If your zefir never sets, check this one thing."

      ],

      "teleprompter_script": "0-3s: Hook\n3-12s: Show thermometer reading at 110C...\n12-15s: Comment 'ZEFIR' for free guide.",

      "caption": "Full recipe and details in description...",

      "cta": "Comment 'ZEFIR'"

    }

  ]

}
```

### Step 4: Monetization & Referral Engine

1. **Plans:**
  - Free Demo (Profile audit + 1 teaser script)
  - Start: 590 RUB / month (12 scripts, full teleprompter view)
  - Pro: 1990 RUB / month (30 scripts, competitor analysis)
2. **Referral Logic:**
  - URL format: `t.me/ReelsFactoryBot?start=ref_{telegram_id}`
  - Save `referrer_id` in database on first user launch.
  - Payout logic: Credit 30% of payment amount to referrer's balance upon payment webhook success.

## Instructions for Cursor Composer

Execute the build process in the following sequential steps:

### Phase 1: Foundation & Database

1. Initialize Next.js app with TypeScript, Tailwind CSS, shadcn/ui, and Prisma ORM.
2. Define Prisma models: `User`, `ProfileAnalysis`, `Script`, `Payment`, `Referral`.
3. Set up `@telegram-apps/sdk-react` provider to support native Telegram Mini App viewport, theme colors, andBackButton.

### Phase 2: Backend API Routes

1. Create `/api/parse-profile`: Calls Instagram Scraping API.
2. Create `/api/transcribe`: Sends audio URL to OpenAI Whisper API.
3. Create `/api/generate-strategy`: Constructs LLM prompt and parses JSON response.
4. Create `/api/payments/webhook`: Handles YoKassa payment response and updates subscription + referral balance.

### Phase 3: Mobile-First Frontend (Mini App UI)

1. **Onboarding Screen:** Stepper form for entering `@username` and preferences.
2. **Analysis Progress Screen:** Animated loader showing "Scanning Bio...", "Transcribing Top Videos...", "Building Content Pillars...".
3. **Results Dashboard:**
  - Audit summary cards.
  - Content Pillars grid.
  - Interactive Script Viewer with a dedicated "Teleprompter Mode" (large text format for recording).
4. **Paywall & Referral Drawer:** Subscription selection modal with a 1-click "Copy Referral Link" button.

```

```

