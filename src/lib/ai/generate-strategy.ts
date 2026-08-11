import {
  getAiTunnelClient,
  llmModel,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { mockStrategy } from "@/lib/mocks/demo-data";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

const STRATEGY_SYSTEM_PROMPT = `Ты стратег короткого видео для Instagram Reels, TikTok и YouTube Shorts.
Все текстовые значения в JSON пиши на русском языке.
Верни ТОЛЬКО валидный JSON по схеме:
{
  "niche": string,
  "target_audience": string,
  "content_pillars": [{"title": string, "description": string}],
  "profile_audit_tips": string[],
  "scripts": [{
    "title": string,
    "format": string,
    "hook_options": string[],
    "teleprompter_script": string,
    "caption": string,
    "cta": string
  }]
}
Сгенерируй 3 сценария с таймкодами в teleprompter_script. Без markdown.`;

export async function generateStrategy(input: {
  profile: ScrapedProfile;
  transcriptions: string[];
  goal: string;
  tone: string;
  offerSummary?: string | null;
  websiteUrl?: string | null;
}): Promise<{ strategy: StrategyPayload; mocked: boolean }> {
  if (shouldUseMockAi()) {
    return {
      strategy: mockStrategy({
        handle: input.profile.handle,
        goal: input.goal,
        tone: input.tone,
        offerSummary: input.offerSummary,
      }),
      mocked: true,
    };
  }

  const userPrompt = JSON.stringify(
    {
      profile: {
        handle: input.profile.handle,
        platform: input.profile.platform,
        bio: input.profile.bio,
        followers: input.profile.followers,
        topVideos: input.profile.topVideos.map((v) => ({
          caption: v.caption,
          views: v.views,
        })),
      },
      transcriptions: input.transcriptions,
      goal: input.goal,
      tone: input.tone,
      offerSummary: input.offerSummary,
      websiteUrl: input.websiteUrl,
    },
    null,
    2,
  );

  const openai = getAiTunnelClient();
  const completion = await openai.chat.completions.create({
    model: llmModel(),
    response_format: { type: "json_object" },
    max_tokens: 4096,
    messages: [
      { role: "system", content: STRATEGY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ LLM через AITunnel");
  return { strategy: parseStrategyJson(content), mocked: false };
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
