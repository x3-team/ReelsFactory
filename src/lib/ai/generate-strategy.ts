import {
  getAiTunnelClient,
  llmModelForStrategy,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { recordCostEvent } from "@/lib/cost-meter";
import { normalizeStrategy } from "@/lib/ai/normalize-strategy";
import { sanitizeStrategy } from "@/lib/ai/sanitize-scripts";
import { contentModeFromTranscripts } from "@/lib/ai/speech-signal";
import { getNichePreset } from "@/lib/niche-presets";
import { mockStrategy } from "@/lib/mocks/demo-data";
import type { ProfileInsights } from "@/lib/content/profile-insights";
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
    "source_angle": string,
    "shot_list": string[]
  }]
}

ЖЁСТКИЕ ПРАВИЛА:
1) Ровно 3 сценария с РАЗНОЙ длительностью: 15, 30 и 45 секунд (duration_sec).
2) teleprompter_script — построчно с таймкодами. Каркас: хук 0–3с → проблема → демо → мягкий CTA.
3) hook_options: 3 варианта ≤ 12 слов (боль / любопытство / результат).
4) Цену/оффер — максимум в 1 из 3 сценариев.
5) Разные форматы (ошибка, процесс, до/после, миф, чеклист). Без «привет друзья».
6) Опирайся на captions/transcriptions, niche_preset и voice_draft если есть.
7) platform_packs и funnel можно опустить — сервер допишет Reels/VK/Shorts/Telegram и воронку.
8) funnel_kit: одно ключевое слово-коммент на все сценарии.
9) pillars_calendar можно опустить — сервер соберёт неделю из столпов.
10) shoot_day: один образ/фон, props, order для 3 сценариев + 4 extra_ideas для досъёма.
11) Юридически спокойный тон: без гарантий дохода и серых схем.
12) Рынок RU/СНГ: VK Клипы — мягче «реклама», Telegram — ценность в тексте, Reels — жёстче хук.
13) Каждый сценарий обязан взять source_angle из caption_angles — конкретный продукт автора. Текст сценария про ТОТ ЖЕ продукт (если угол «мятный зефир в шоколаде» — в кадре мята и шоколад, не общие «3 ошибки»).
14) shot_list: 4–6 кадров «что в кадре». Если content_mode = process_no_speech, суфлёр = закадр или текст на экране, НЕ «смотри в камеру».
15) Одно comment_keyword на funnel_kit и ВСЕ сценарии. Без суффиксов 2/3.
16) Цену не произносить в суфлёре. В подписи — максимум в 1 ролике.
17) Аудит профиля: каждый совет цитирует био или подпись. Не предлагай Telegram, если has_website_cta. Не предлагай «добавь CTA», если подписи уже продают.
18) Голос копируй с voice_samples (я/мы, плотность эмодзи, тепло vs эксперт).
19) Не повторяй названия из avoid_titles. winning_hooks — паттерны, которые уже залетели у автора: усиливай этот угол, не копируй дословно.
20) fact_card.allowed и without — единственные продукты/ингредиенты. НЕ выдумывай йогурт, бисквит, глютен, кокос, желатин, пектин, если их нет в allowed.
21) Не пиши «за N минут» и температуры °C, если их нет в подписях. Не подменяй продукт (птичье молоко ≠ бисквит).`;

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
  previousTitles?: string[];
  winningHooks?: string[];
  userId?: string;
  insights?: ProfileInsights;
}): Promise<{ strategy: StrategyPayload; mocked: boolean; model: string }> {
  const model = llmModelForStrategy(input.plan);
  const niche = getNichePreset(input.nichePreset);
  const usableTranscripts = (input.transcriptions || []).filter((t) =>
    t && t.trim().length > 0,
  );
  const contentMode = contentModeFromTranscripts(usableTranscripts);
  const sharedKeyword =
    input.insights?.suggestedKeyword ||
    "ГАЙД";

  if (shouldUseMockAi()) {
    return {
      strategy: sanitizeStrategy(
        normalizeStrategy(
          mockStrategy({
            handle: input.profile.handle,
            goal: input.goal,
            tone: input.tone,
            offerSummary: input.offerSummary,
            nichePreset: niche?.label || input.nichePreset,
            voiceDraft: input.voiceDraft,
          }),
          input.previousTitles,
          { sharedKeyword },
        ),
        sharedKeyword,
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
        topVideos: input.profile.topVideos.slice(0, 12).map((v) => ({
          views: v.views,
          durationSec: v.durationSec,
        })),
      },
      transcriptions: usableTranscripts,
      content_mode: contentMode,
      insights: input.insights
        ? {
            products: input.insights.products,
            prices: input.insights.prices,
            has_website_cta: input.insights.hasWebsiteCta,
            has_telegram_cta: input.insights.hasTelegramCta,
            voice_samples: input.insights.voiceSamples,
            caption_angles: input.insights.captionAngles.map((a) => ({
              views: a.views,
              hook: a.hookLine,
            })),
            suggested_keyword: input.insights.suggestedKeyword,
            bio_excerpt: input.insights.bioExcerpt,
            fact_card: {
              allowed: input.insights.factCard.allowed,
              without: input.insights.factCard.withoutClaims,
              do_not_invent: [
                "йогурт",
                "бисквит",
                "глютен",
                "за N минут",
                "температура °C",
              ],
            },
          }
        : null,
      goal: input.goal,
      tone: input.tone,
      offerSummary: input.offerSummary,
      websiteUrl: input.websiteUrl,
      niche_preset: niche
        ? { id: niche.id, label: niche.label, pain: niche.pain }
        : null,
      voice_draft: input.voiceDraft || null,
      avoid_titles: (input.previousTitles || []).slice(0, 20),
      winning_hooks: (input.winningHooks || []).slice(0, 10),
      plan: input.plan || "FREE",
      script_brief: {
        count: 3,
        durations_sec: [15, 30, 45],
        max_scripts_with_price_mention: 1,
        no_price_in_teleprompter: true,
        shared_comment_keyword: sharedKeyword,
        avoid_greetings: true,
        require_platform_packs: false,
        require_shoot_day: true,
        require_pillars_calendar: false,
        require_source_angle: true,
        require_shot_list: true,
        market: "RU_CIS",
      },
    },
    null,
    2,
  );

  const openai = getAiTunnelClient();
  const request = (maxTokens: number) =>
    openai.chat.completions.create(
      {
        model,
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: STRATEGY_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.75,
      },
      { timeout: 180_000, maxRetries: 0 },
    );

  let completion = await request(6000);
  let content = completion.choices[0]?.message?.content;
  if (!content) {
    completion = await request(7000);
    content = completion.choices[0]?.message?.content;
  }
  if (!content) {
    throw new Error(
      `Пустой ответ LLM через AITunnel (model=${model}, finish=${completion.choices[0]?.finish_reason || "?"})`,
    );
  }
  await recordCostEvent("llm", input.userId, "strategy");
  return {
    strategy: sanitizeStrategy(
      normalizeStrategy(parseStrategyJson(content), input.previousTitles, {
        sharedKeyword,
      }),
      sharedKeyword,
    ),
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
