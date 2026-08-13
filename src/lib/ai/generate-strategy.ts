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
import { sliceChars } from "@/lib/ai/safe-json";
import {
  isWeakAngle,
  nicheFromInsights,
  type ProfileInsights,
} from "@/lib/content/profile-insights";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

const STRATEGY_SYSTEM_PROMPT = `Ты стратег короткого видео для рынка РФ/СНГ (Instagram Reels, VK Клипы, YouTube Shorts, Telegram).
Пиши ВСЕ строки JSON на русском. Верни ТОЛЬКО валидный JSON без markdown.
Сценарии НЕ пиши — сервер соберёт их из fact_card (продукт + 4 кадра + шаблон суфлёра).
Заполни нишу, аудиторию, столпы, аудит, воронку и идеи дос съёмки.

Схема:
{
  "scripts": [],
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
  "shoot_day": {
    "title": string,
    "duration_min": number,
    "outfit": string,
    "location": string,
    "props": string[],
    "extra_ideas": [{"title": string, "hook": string, "pillar": string, "duration_sec": number}]
  }
}

ЖЁСТКИЕ ПРАВИЛА:
1) scripts оставь пустым массивом.
2) Ниша и аудитория — из bio / caption_angles / visual_notes, не «короткий контент».
3) Столпы 3–5 из реальных продуктов и тем автора.
4) Аудит: каждый совет цитирует био или подпись. Не предлагай Telegram, если has_website_cta. Не предлагай «добавь CTA», если подписи уже продают.
5) funnel_kit: одно ключевое слово-коммент на все ролики, без суффиксов 2/3.
6) shoot_day: один образ/фон, props, 4 extra_ideas из caption_angles (не дублируй топ-3 углов).
7) fact_card.allowed и without — единственные продукты/ингредиенты. НЕ выдумывай то, чего нет в allowed и visual_notes.
8) Не пиши «за N минут» и температуры °C, если их нет в подписях.
9) Голос копируй с voice_samples (я/мы, плотность эмодзи, тепло vs эксперт).
10) Юридически спокойный тон: без гарантий дохода и серых схем.
11) Рынок RU/СНГ. pillars_calendar можно опустить — сервер соберёт неделю из столпов.`;

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
          caption: sliceChars(v.caption || "", 180),
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
            caption_angles: input.insights.captionAngles.slice(0, 10).map((a) => ({
              views: a.views,
              hook: a.hookLine,
              caption: sliceChars(a.caption || "", 180),
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
            visual_notes: (input.insights.visualNotes || []).slice(0, 4).map((n) => ({
              product: n.product,
              process: n.process,
              on_screen_text: n.onScreenText.slice(0, 4),
            })),
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
        require_scripts: false,
        require_source_angle: false,
        require_shot_list: false,
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
        temperature: 0.55,
      },
      { timeout: 90_000, maxRetries: 0 },
    );

  async function attempt(maxTokens: number) {
    const completion = await request(maxTokens);
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error(
        `Пустой ответ LLM (model=${model}, finish=${completion.choices[0]?.finish_reason || "?"})`,
      );
    }
    return { completion, parsed: parseStrategyJson(content) };
  }

  let result: Awaited<ReturnType<typeof attempt>>;
  try {
    result = await attempt(2800);
  } catch {
    try {
      result = await attempt(4000);
    } catch (error) {
      console.warn(
        "LLM strategy failed, using local shell",
        error instanceof Error ? error.message : error,
      );
      await recordCostEvent("llm", input.userId, "strategy-fallback");
      return {
        strategy: sanitizeStrategy(
          normalizeStrategy(
            localStrategyShell(input, sharedKeyword),
            input.previousTitles,
            { sharedKeyword },
          ),
          sharedKeyword,
        ),
        mocked: false,
        model: "local-shell",
      };
    }
  }
  await recordCostEvent("llm", input.userId, "strategy");
  return {
    strategy: sanitizeStrategy(
      normalizeStrategy(result.parsed, input.previousTitles, {
        sharedKeyword,
      }),
      sharedKeyword,
    ),
    mocked: false,
    model: result.completion.model || model,
  };
}

function localStrategyShell(
  input: {
    insights?: ProfileInsights;
    profile: ScrapedProfile;
  },
  sharedKeyword: string,
): StrategyPayload {
  const angles = (input.insights?.captionAngles || [])
    .filter((a) => !isWeakAngle(a.hookLine))
    .slice(0, 4);
  return {
    niche: input.insights ? nicheFromInsights(input.insights) : "Контент автора",
    target_audience: "Подписчики автора в РФ/СНГ",
    content_pillars: [
      {
        title: "Процесс",
        description: "Показать, как делается то, что уже есть в профиле",
      },
      {
        title: "Результат",
        description: "Крупный план готового кадра из залетевших роликов",
      },
      {
        title: "Оффер",
        description: "Мягкий CTA одним словом в комментарии",
      },
    ],
    profile_audit_tips: [
      input.insights?.bioExcerpt
        ? `Био: «${sliceChars(input.insights.bioExcerpt, 80)}» — оставь обещание, не размывай.`
        : "Сформулируй в био, что получит человек после подписки.",
    ],
    scripts: [],
    funnel_kit: {
      comment_keyword: sharedKeyword,
      bot_reply: "Лови материал. Сохрани сообщение.",
      lead_magnet: "материал по комментарию",
      telegram_cta: `Напиши боту слово ${sharedKeyword}`,
    },
    shoot_day: {
      title: "Съёмочный день · 1 образ",
      duration_min: 90,
      outfit: "Один нейтральный верх",
      location: "Один спокойный фон",
      props: ["штатив", "готовая деталь для крупного плана"],
      order: [],
      extra_ideas: angles.map((a, i) => ({
        title: sliceChars(a.hookLine, 56),
        hook: a.hookLine,
        pillar: "ассортимент",
        duration_sec: i % 2 === 0 ? 15 : 30,
      })),
    },
  };
}

function parseStrategyJson(raw: string): StrategyPayload {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  let parsed: StrategyPayload;
  try {
    parsed = JSON.parse(cleaned) as StrategyPayload;
  } catch {
    throw new Error("LLM JSON не разбирается");
  }
  if (!Array.isArray(parsed.scripts)) {
    parsed.scripts = [];
  }
  return parsed;
}
