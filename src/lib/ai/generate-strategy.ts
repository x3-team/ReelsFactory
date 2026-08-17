import {
  getAiTunnelClient,
  llmModelForPlan,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { extractFactAnchors, selectVariableSlotsForAngle } from "@/lib/ai/fact-extractor";
import {
  extractChatContent,
  normalizeStrategy,
  parseStrategyJson,
} from "@/lib/ai/normalize-strategy";
import {
  SourceAnchorError,
  assertStrategyAnchored,
  extractAnchorPhrases,
  sourceCorpus,
  withSourceHonestyTips,
} from "@/lib/ai/source-anchors";
import { VIRAL_SKELETONS } from "@/lib/ai/viral-skeletons";
import { mockStrategy } from "@/lib/mocks/demo-data";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

export const STRATEGY_SYSTEM_PROMPT = `Ты пишешь сценарии коротких рилсов для камеры. Рынок РФ/СНГ.
Пиши ВСЕ строки JSON на русском. Верни ТОЛЬКО валидный JSON без markdown.

SYSTEM PROMPT GUARDRAIL:
You are a strict data-driven video script writer. You MUST NOT invent stats, facts, prices, or technical details not present in the provided context.
All product claims and numbers must be rooted strictly in the provided fact_anchors.
Always base the hook structure and teleprompter skeleton on the provided viral_skeletons.

Схема:
{
  "niche": string,
  "target_audience": string,
  "content_pillars": [{"title": string, "description": string}],
  "profile_audit_tips": string[],
  "scripts": [{
    "title": string,
    "format": string,
    "duration_sec": number,
    "hook_options": string[],
    "teleprompter_script": string,
    "caption": string,
    "cta": string,
    "visual_cues": {
      "start0_3s": string,
      "midAction": string,
      "finalCta": string
    }
  }]
}

ГЛАВНОЕ — teleprompter_script:
Это слова, которые человек ЧИТАЕТ вслух в камеру. Как говорят в рилсе: коротко, вслух, с паузами.
Пиши от первого или второго лица. «Смотри», «вот», «стоп», «слушай». Живая устная речь.
НЕ режиссёрские ремарки: запрещены «произнесите», «покажите на экране», «смотрите в камеру», «сделайте жест».
НЕ канцелярит и НЕ лозунги: запрещены «контент-машина», «viral hooks», «мы №1», «контент-стратегия», «целевая аудитория» внутри суфлёра, «масштабировать личный бренд».
Крючок обязан опираться на КОНКРЕТИКУ из bio / captions / transcriptions: термин, ошибка, цифра, продукт, приём. Не «ваш контент умирает».
Три сценария — три РАЗНЫХ угла: 15с боль/ошибка, 30с процесс/приём, 45с миф или до/после. Не пересказ одного и того же.

КАРКАС (оставь, но текст внутри — устный):
- 0–3с: HOOK, без «привет» и без представления
- дальше: проблема / ошибка
- демо / один конкретный приём
- финал: мягкий CTA

ЖЁСТКИЕ ПРАВИЛА:
1) Ровно 3 сценария: duration_sec = 15, 30, 45. format вида «Reels 15с · ошибка».
2) teleprompter_script — построчно с таймкодами под длину. Каждая строка: «0–3с: слова вслух».
3) hook_options: 3 штуки, каждая ≤ 12 слов, разные углы (боль / любопытство / результат).
4) НЕ копируй цены, «1300 рублей», «обучение в шапке» в каждый ролик. Цену/оффер — максимум в 1 из 3, только если уместно цели.
5) Не клонируй фразы между сценариями.
6) ЯКОРЬ: каждый из 3 сценариев ОБЯЗАН содержать опознаваемый факт из transcriptions или captions — цитату, цифру, термин, ошибку или продукт ЭТОГО профиля. Без якоря сценарий — брак. Не уходи в общую нишу.
7) Не копируй транскрипт целиком и не делай закадровый пересказ ролика. Возьми якорь и собери НОВЫЙ устный каркас хук → проблема → демо → CTA.
8) Три якоря — три разных продукта/приёма из source_anchors. Не повторяй один десерт в 30с и 45с, если в профиле есть другие.
9) Не выдумывай технологию, которой нет во входе: «температура сиропа», «завиток», «агар», «термометр» — только если эти слова есть в transcriptions/captions.
10) Если transcriptions пустые или голос не разобрали — НЕ притворяйся, что слышала речь. Пиши только из captions/bio. Первой строкой profile_audit_tips скажи, что сценарии по подписям. Музыка, заставка, «Thank you for watching», чужой язык — это не речь.
11) Если source_strength = weak или empty: подписи пустые, хэштеги или один и тот же копипаст. НЕ пиши, что стратегия «огонь» / сильная / вирусная. НЕ выдумывай упражнения (ноги/пресс/суперсет), граммовки, законы, температуры и приёмы, которых нет во входе. Три коротких сценария строго из bio + этой подписи. Первой строкой tips — что материала мало.
12) visual_cues: дай 3 короткие подсказки по кадру (0-3с, середина, CTA) без загромождения текста суфлера.
13) niche / tips — по-человечески, без корпоративного тона.`;

export type GenerateStrategyInput = {
  profile: ScrapedProfile;
  transcriptions: string[];
  goal: string;
  tone: string;
  offerSummary?: string | null;
  websiteUrl?: string | null;
  /** FREE | START | PRO | AGENCY — влияет на модель */
  plan?: string | null;
};

export function strategySourceFromInput(input: GenerateStrategyInput) {
  return sourceCorpus({
    bio: input.profile.bio,
    captions: input.profile.topVideos.map((video) => video.caption || ""),
    transcriptions: input.transcriptions,
  });
}

export function buildStrategyUserPrompt(
  input: GenerateStrategyInput,
  source: ReturnType<typeof strategySourceFromInput>,
): string {
  const anchors = extractAnchorPhrases(source.texts);
  const factAnchors = extractFactAnchors({
    bio: input.profile.bio,
    captions: input.profile.topVideos.map((v) => v.caption || ""),
    transcriptions: source.usableVoice,
    offerSummary: input.offerSummary,
    strength: source.strength,
  });

  const skeletons = [
    {
      angle: "error",
      duration_sec: 15,
      skeleton: VIRAL_SKELETONS.error,
      variables: selectVariableSlotsForAngle(factAnchors, 0),
    },
    {
      angle: "process",
      duration_sec: 30,
      skeleton: VIRAL_SKELETONS.process,
      variables: selectVariableSlotsForAngle(factAnchors, 1),
    },
    {
      angle: "myth_or_contrast",
      duration_sec: 45,
      skeleton: VIRAL_SKELETONS.myth_or_contrast,
      variables: selectVariableSlotsForAngle(factAnchors, 2),
    },
  ];

  return JSON.stringify(
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
      transcriptions: source.usableVoice,
      voice_heard: source.voiceHeard,
      source_strength: source.strength,
      voice_note: source.voiceHeard
        ? "Голос разобрали. Якорь можно брать из transcriptions или captions."
        : "Голос не разобрали (тишина, музыка, заставка или чужой язык). НЕ пиши «как в ролике сказано». Только captions/bio. Пометь это в profile_audit_tips.",
      source_note:
        source.strength === "ok"
          ? "Подписей достаточно. Не выдумывай технологию, которой нет во входе."
          : "Подписи пустые или копипаст. Это НЕ «стратегия огонь». Только слова из bio/captions. Без выдуманных упражнений, граммовок, законов и температур.",
      source_anchors: anchors,
      extracted_facts: factAnchors,
      viral_reference_skeletons: skeletons,
      goal: input.goal,
      tone: input.tone,
      offerSummary: input.offerSummary,
      websiteUrl: input.websiteUrl,
      plan: input.plan || "FREE",
      script_brief: {
        count: 3,
        durations_sec: [15, 30, 45],
        max_scripts_with_price_mention: 1,
        avoid_greetings: true,
        speakable_teleprompter: true,
        no_director_notes: true,
        three_angles: ["ошибка", "процесс", "миф_или_до_после"],
        required_anchor_in_each_script: true,
        distinct_products: true,
        visual_cues_required: true,
        anchor_rule:
          "Каждый сценарий обязан содержать хотя бы один якорь из source_anchors (цитата / цифра / приём / продукт). Три сценария — три РАЗНЫХ продукта или приёма. Не делай 30с и 45с про один бенто, если в якорях есть зефир и маршмеллоу.",
      },
    },
    null,
    2,
  );
}

function finalizeStrategy(
  raw: unknown,
  source: ReturnType<typeof strategySourceFromInput>,
): StrategyPayload {
  const strategy = withSourceHonestyTips(normalizeStrategy(raw), {
    voiceHeard: source.voiceHeard,
    strength: source.strength,
  });
  assertStrategyAnchored(strategy, source.texts, source.strength);
  return strategy;
}

async function requestStrategyJson(input: {
  model: string;
  userPrompt: string;
  isPro: boolean;
}): Promise<{ parsed: unknown; model: string }> {
  const openai = getAiTunnelClient();
  const completion = await openai.chat.completions.create({
    model: input.model,
    response_format: { type: "json_object" },
    max_tokens: input.isPro ? 6000 : 4500,
    messages: [
      { role: "system", content: STRATEGY_SYSTEM_PROMPT },
      { role: "user", content: input.userPrompt },
    ],
    temperature: 0.8,
  });

  const { text: content, finishReason } = extractChatContent(completion);
  if (!content) {
    throw new Error(
      `Пустой ответ LLM через AITunnel (model=${input.model}, finish=${finishReason})`,
    );
  }
  return {
    parsed: parseStrategyJson(content),
    model: completion.model || input.model,
  };
}

export async function generateStrategy(
  input: GenerateStrategyInput,
): Promise<{ strategy: StrategyPayload; mocked: boolean; model: string }> {
  const model = llmModelForPlan(input.plan);
  const source = strategySourceFromInput(input);

  if (shouldUseMockAi()) {
    return {
      strategy: finalizeStrategy(
        mockStrategy({
          handle: input.profile.handle,
          goal: input.goal,
          tone: input.tone,
          offerSummary: input.offerSummary,
          bio: input.profile.bio,
          captions: input.profile.topVideos.map((video) => video.caption || ""),
          transcriptions: source.usableVoice,
        }),
        source,
      ),
      mocked: true,
      model: "mock",
    };
  }

  const userPrompt = buildStrategyUserPrompt(input, source);
  const isPro = ["PRO", "AGENCY"].includes((input.plan || "").toUpperCase());
  const first = await requestStrategyJson({ model, userPrompt, isPro });
  try {
    return {
      strategy: finalizeStrategy(first.parsed, source),
      mocked: false,
      model: first.model,
    };
  } catch (error) {
    if (!(error instanceof SourceAnchorError)) throw error;
    const retryPrompt = `${userPrompt}\n\nПРЕДЫДУЩИЙ JSON ЗАБРАКОВАН: ${error.message}\nВ каждый из 3 сценариев вставь разный якорь из source_anchors. Не уходи в общую нишу. Если source_strength=weak — не выдумывай детали и не хвали стратегию.`;
    const retry = await requestStrategyJson({
      model,
      userPrompt: retryPrompt,
      isPro,
    });
    try {
      return {
        strategy: finalizeStrategy(retry.parsed, source),
        mocked: false,
        model: retry.model,
      };
    } catch (retryError) {
      if (!(retryError instanceof SourceAnchorError) || source.strength === "ok") {
        throw retryError;
      }
      return {
        strategy: finalizeStrategy(
          mockStrategy({
            handle: input.profile.handle,
            goal: input.goal,
            tone: input.tone,
            offerSummary: input.offerSummary,
            bio: input.profile.bio,
            captions: input.profile.topVideos.map((video) => video.caption || ""),
            transcriptions: source.usableVoice,
          }),
          source,
        ),
        mocked: false,
        model: retry.model,
      };
    }
  }
}
