import {
  getAiTunnelClient,
  llmModelForStrategy,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { normalizeStrategy } from "@/lib/ai/normalize-strategy";
import { getNichePreset } from "@/lib/niche-presets";
import { mockStrategy } from "@/lib/mocks/demo-data";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

const STRATEGY_SYSTEM_PROMPT = `Ты стратег короткого видео для рынка РФ/СНГ (Instagram Reels, VK Клипы, YouTube Shorts, Telegram).
Пиши ВСЕ строки JSON на русском. Верни ТОЛЬКО валидный JSON без markdown.

Схема:
{
  "niche": string,
  "target_audience": string,
  "content_pillars": [{"title": string, "description": string}],
  "profile_audit_tips": string[],
  "funnel_kit": {
    "comment_keyword": string,
    "bot_reply": string,
    "lead_magnet": string,
    "telegram_cta": string
  },
  "autopsy_template": {
    "weak_hook_fix": string,
    "retention_fix": string,
    "cta_fix": string,
    "reshoot_hook": string
  },
  "pillars_calendar": [{
    "day": number,
    "pillar": string,
    "role": "trust"|"expert"|"offer"|"social_proof"|"entertainment",
    "topic": string,
    "platform_focus": "reels"|"vk"|"shorts"|"telegram"
  }],
  "shoot_day": {
    "title": string,
    "duration_min": number,
    "outfit": string,
    "location": string,
    "props": string[],
    "order": [{"shoot_order": number, "script_title": string, "duration_sec": number, "note": string}],
    "extra_ideas": [{"title": string, "hook": string, "pillar": string, "duration_sec": number}]
  },
  "scripts": [{
    "title": string,
    "format": string,
    "duration_sec": number,
    "shoot_order": number,
    "comment_keyword": string,
    "props_checklist": string[],
    "hook_options": string[],
    "teleprompter_script": string,
    "caption": string,
    "cta": string,
    "platform_packs": {
      "reels": {"caption": string, "cta": string, "hashtags": string[]},
      "vk_clips": {"caption": string, "cta": string},
      "shorts": {"title": string, "description": string, "cta": string},
      "telegram_post": {"text": string, "cta": string}
    },
    "funnel": {
      "comment_keyword": string,
      "bot_reply": string,
      "lead_magnet": string,
      "telegram_cta": string
    }
  }]
}

ЖЁСТКИЕ ПРАВИЛА:
1) Ровно 3 сценария с РАЗНОЙ длительностью: 15, 30 и 45 секунд (duration_sec).
2) teleprompter_script — построчно с таймкодами. Каркас: хук 0–3с → проблема → демо → мягкий CTA.
3) hook_options: 3 варианта ≤ 12 слов (боль / любопытство / результат).
4) Цену/оффер — максимум в 1 из 3 сценариев.
5) Разные форматы (ошибка, процесс, до/после, миф, чеклист). Без «привет друзья».
6) Опирайся на captions/transcriptions, niche_preset и voice_draft если есть.
7) platform_packs обязателен у каждого сценария: Reels + VK Клипы + Shorts + Telegram-пост (разный CTA/язык площадки).
8) funnel_kit + funnel у сценариев: одно ключевое слово-коммент → ответ бота / Telegram.
9) pillars_calendar: ровно 7 дней, чередуй role (trust/expert/offer/social_proof/entertainment).
10) shoot_day: один образ/фон, props, order для 3 сценариев + 4 extra_ideas для досъёма.
11) Юридически спокойный тон: без гарантий дохода и серых схем.
12) Рынок RU/СНГ: VK Клипы — мягче «реклама», Telegram — ценность в тексте, Reels — жёстче хук.
13) Удержание: первая конкретная польза не позже 40% хронометража; цифры/ошибки сильнее абстракций.`;

export async function generateStrategy(input: {
  profile: ScrapedProfile;
  transcriptions: string[];
  goal: string;
  tone: string;
  offerSummary?: string | null;
  websiteUrl?: string | null;
  plan?: string | null;
  nichePreset?: string | null;
  voiceDraft?: string | null;
}): Promise<{ strategy: StrategyPayload; mocked: boolean; model: string }> {
  const model = llmModelForStrategy(input.plan);
  const niche = getNichePreset(input.nichePreset);

  if (shouldUseMockAi()) {
    return {
      strategy: normalizeStrategy(
        mockStrategy({
          handle: input.profile.handle,
          goal: input.goal,
          tone: input.tone,
          offerSummary: input.offerSummary,
          nichePreset: niche?.label || input.nichePreset,
          voiceDraft: input.voiceDraft,
        }),
      ),
      mocked: true,
      model: "mock",
    };
  }

  const userPrompt = JSON.stringify(
    {
      profile: {
        handle: input.profile.handle,
        platform: input.profile.platform,
        displayName: input.profile.displayName,
        bio: input.profile.bio,
        followers: input.profile.followers,
        topVideos: input.profile.topVideos.map((v) => ({
          caption: v.caption,
          views: v.views,
          durationSec: v.durationSec,
        })),
      },
      transcriptions: input.transcriptions,
      goal: input.goal,
      tone: input.tone,
      offerSummary: input.offerSummary,
      websiteUrl: input.websiteUrl,
      niche_preset: niche
        ? { id: niche.id, label: niche.label, pain: niche.pain }
        : null,
      voice_draft: input.voiceDraft || null,
      plan: input.plan || "FREE",
      script_brief: {
        count: 3,
        durations_sec: [15, 30, 45],
        max_scripts_with_price_mention: 1,
        avoid_greetings: true,
        require_platform_packs: true,
        require_shoot_day: true,
        require_pillars_calendar: true,
        market: "RU_CIS",
      },
    },
    null,
    2,
  );

  const openai = getAiTunnelClient();
  const isPro = ["PRO", "AGENCY"].includes((input.plan || "").toUpperCase());
  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    // Flash: держим потолок ниже — нормализатор добьёт структуру без второго вызова
    max_tokens: isPro ? 6500 : 5500,
    messages: [
      { role: "system", content: STRATEGY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.75,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(
      `Пустой ответ LLM через AITunnel (model=${model}, finish=${completion.choices[0]?.finish_reason || "?"})`,
    );
  }
  return {
    strategy: normalizeStrategy(parseStrategyJson(content)),
    mocked: false,
    model: completion.model || model,
  };
}

function parseStrategyJson(raw: string): StrategyPayload {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as StrategyPayload;
  if (
    !parsed.niche ||
    !parsed.target_audience ||
    !Array.isArray(parsed.content_pillars) ||
    !Array.isArray(parsed.profile_audit_tips) ||
    !Array.isArray(parsed.scripts)
  ) {
    throw new Error("LLM JSON не содержит обязательных полей");
  }
  return parsed;
}
