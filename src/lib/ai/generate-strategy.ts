import {
  getAiTunnelClient,
  llmModelForPlan,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import type { VideoEvidence } from "@/lib/ai/transcribe";
import { mockStrategy } from "@/lib/mocks/demo-data";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

const STRATEGY_SYSTEM_PROMPT = `Ты стратег короткого видео для Instagram Reels / TikTok (рынок РФ/СНГ).
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

ЖЁСТКИЕ ПРАВИЛА СЦЕНАРИЕВ:
1) Ровно 3 сценария с РАЗНОЙ длительностью: 15, 30 и 45 секунд (duration_sec = 15|30|45).
2) teleprompter_script — построчно с таймкодами под выбранную длину.
   Каркас (обязателен):
   - 0–3с: HOOK (остановка скролла, без «привет друзья»)
   - дальше: проблема / ошибка / интрига
   - демо / доказательство / конкретный приём (не вода)
   - финал: мягкий CTA (коммент / сохранение / ссылка) — без давления
3) hook_options: 3 варианта, каждый ≤ 12 слов, разные углы (боль / любопытство / результат).
4) НЕ копируй цены, «1300 рублей», «обучение в шапке» в каждый сценарий.
   Цену/оффер можно упомянуть МАКСИМУМ в 1 из 3 сценариев и только если это уместно цели.
5) Не клонируй одни и те же фразы между сценариями. Разные форматы (ошибка, процесс, до/после, миф, чеклист).
6) Опирайся на реальные темы профиля. Если есть блоки source="whisper" — это речь автора:
   приоритетно бери оттуда живые формулировки, тон и хуки; caption — вторичен.
   Если только caption — не выдумывай «голос», опирайся на подписи и bio.
7) format — кратко, напр. «Reels 30с · ошибка», «Reels 15с · хук-приём».

ЖЁСТКИЕ ПРАВИЛА ТЕМ (content_pillars = темы на неделю):
8) Ровно 3 темы — по одной на каждый сценарий (тема 1 ↔ сценарий 1, 2↔2, 3↔3).
9) title темы — коротко (2–5 слов), description — одна фраза: о чём снимать в этой теме.
10) Не выдавай 4+ тем: лишние темы без сценария только путают. В ответах пользователю никогда не называй их «столпами» — только «темы».`;

export async function generateStrategy(input: {
  profile: ScrapedProfile;
  transcriptions: string[];
  videoEvidence?: VideoEvidence[];
  goal: string;
  tone: string;
  offerSummary?: string | null;
  websiteUrl?: string | null;
  /** FREE | START | PRO | AGENCY — влияет на модель */
  plan?: string | null;
}): Promise<{ strategy: StrategyPayload; mocked: boolean; model: string }> {
  const model = llmModelForPlan(input.plan);

  if (shouldUseMockAi()) {
    return {
      strategy: mockStrategy({
        handle: input.profile.handle,
        goal: input.goal,
        tone: input.tone,
        offerSummary: input.offerSummary,
      }),
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
      // Структурированные доказательства: whisper = речь, caption = подпись
      video_evidence:
        input.videoEvidence ||
        input.transcriptions.map((t) => ({
          source: "caption",
          transcript: t,
        })),
      transcriptions: input.transcriptions,
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
        prefer_spoken_hooks_from_whisper: true,
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
    max_tokens: isPro ? 6000 : 4500,
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
    strategy: parseStrategyJson(content),
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
  // Жёстко 3↔3: тема на каждый сценарий, без «лишних» тем
  parsed.content_pillars = parsed.content_pillars.slice(0, 3);
  parsed.scripts = parsed.scripts.slice(0, 3);
  return parsed;
}
