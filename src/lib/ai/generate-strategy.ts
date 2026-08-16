import {
  getAiTunnelClient,
  llmModelForPlan,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
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
  withVoiceHeardTip,
} from "@/lib/ai/source-anchors";
import { mockStrategy } from "@/lib/mocks/demo-data";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

export const STRATEGY_SYSTEM_PROMPT = `Ты пишешь сценарии коротких рилсов для камеры. Рынок РФ/СНГ.
Пиши ВСЕ строки JSON на русском. Верни ТОЛЬКО валидный JSON без markdown.

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
    "cta": string
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
8) Если transcriptions пустые или голос не разобрали — НЕ притворяйся, что слышала речь. Пиши только из captions/bio. Первой строкой profile_audit_tips скажи, что сценарии по подписям.
9) niche / tips — по-человечески, без корпоративного тона.`;

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
      voice_note: source.voiceHeard
        ? "Голос разобрали. Якорь можно брать из transcriptions или captions."
        : "Голос не разобрали (тишина, музыка или чужой язык). НЕ пиши «как в ролике сказано». Только captions/bio. Пометь это в profile_audit_tips.",
      source_anchors: anchors,
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
        anchor_rule:
          "Каждый сценарий обязан содержать хотя бы один якорь из source_anchors (цитата / цифра / приём / продукт). Иначе JSON забракуют.",
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
  const strategy = withVoiceHeardTip(normalizeStrategy(raw), source.voiceHeard);
  assertStrategyAnchored(strategy, source.texts);
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
    const retryPrompt = `${userPrompt}\n\nПРЕДЫДУЩИЙ JSON ЗАБРАКОВАН: ${error.message}\nВ каждый из 3 сценариев вставь разный якорь из source_anchors. Не уходи в общую нишу.`;
    const retry = await requestStrategyJson({
      model,
      userPrompt: retryPrompt,
      isPro,
    });
    return {
      strategy: finalizeStrategy(retry.parsed, source),
      mocked: false,
      model: retry.model,
    };
  }
}
