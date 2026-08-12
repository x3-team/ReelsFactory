import {
  getAiTunnelClient,
  llmModelForStudio,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { mockViralRemake } from "@/lib/mocks/demo-data";
import type { ViralRemakePayload } from "@/lib/types";

const REMAKE_SYSTEM = `Ты сценарист короткого видео для РФ/СНГ.
По ссылке/описанию чужого вирусного ролика извлеки структуру (хук→конфликт→демо→CTA)
и перепиши под бренд пользователя. Верни ТОЛЬКО JSON на русском.

Схема:
{
  "source_url": string,
  "source_structure": {"hook": string, "conflict": string, "demo": string, "cta": string},
  "remake": {
    "title": string,
    "format": string,
    "duration_sec": number,
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
  },
  "platform_packs": { ... same as remake.platform_packs },
  "funnel": { ... same as remake.funnel }
}

Правила: не копируй текст оригинала дословно; адаптируй под нишу/оффер/тон; duration_sec 20–35; без гарантий дохода.`;

export async function generateViralRemake(input: {
  sourceUrl: string;
  sourceCaption?: string | null;
  sourceTranscript?: string | null;
  niche?: string | null;
  goal?: string | null;
  tone?: string | null;
  offerSummary?: string | null;
  nichePreset?: string | null;
  plan?: string | null;
}): Promise<{ remake: ViralRemakePayload; mocked: boolean; model: string }> {
  const model = llmModelForStudio(input.plan);

  if (shouldUseMockAi()) {
    return {
      remake: mockViralRemake({
        sourceUrl: input.sourceUrl,
        offerSummary: input.offerSummary,
      }),
      mocked: true,
      model: "mock",
    };
  }

  const openai = getAiTunnelClient();
  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    max_tokens: 4000,
    temperature: 0.7,
    messages: [
      { role: "system", content: REMAKE_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          source_url: input.sourceUrl,
          source_caption: input.sourceCaption,
          source_transcript: input.sourceTranscript,
          brand: {
            niche: input.niche,
            niche_preset: input.nichePreset,
            goal: input.goal,
            tone: input.tone,
            offer: input.offerSummary,
          },
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ LLM (viral remake)");
  const remake = JSON.parse(content) as ViralRemakePayload;
  if (!remake.remake?.teleprompter_script) {
    throw new Error("Remake JSON неполный");
  }
  return {
    remake,
    mocked: false,
    model: completion.model || model,
  };
}
