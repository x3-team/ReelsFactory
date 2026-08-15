import {
  getAiTunnelClient,
  llmModelForStudio,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { mockAutopsy } from "@/lib/mocks/demo-data";
import type { AutopsyPayload } from "@/lib/types";

const AUTOPSY_SYSTEM = `Ты аналитик короткого видео для РФ/СНГ.
Разбери, почему ролик мог не залететь, и дай пересъём. Верни ТОЛЬКО JSON на русском.

Схема:
{
  "source_url": string,
  "score": number,
  "findings": {
    "weak_hook_fix": string,
    "retention_fix": string,
    "cta_fix": string,
    "reshoot_hook": string
  },
  "rewritten_hooks": string[],
  "reshoot_script": {
    "title": string,
    "format": string,
    "duration_sec": number,
    "comment_keyword": string,
    "hook_options": string[],
    "teleprompter_script": string,
    "caption": string,
    "cta": string
  }
}

Правила: score 0–100; rewritten_hooks ровно 3; без токсичности и гарантий охватов.`;

export async function generateAutopsy(input: {
  sourceUrl: string;
  caption?: string | null;
  transcript?: string | null;
  niche?: string | null;
  offerSummary?: string | null;
  plan?: string | null;
}): Promise<{ autopsy: AutopsyPayload; mocked: boolean; model: string }> {
  const model = llmModelForStudio(input.plan);

  if (shouldUseMockAi()) {
    return {
      autopsy: mockAutopsy({
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
    max_tokens: 3500,
    temperature: 0.65,
    messages: [
      { role: "system", content: AUTOPSY_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          source_url: input.sourceUrl,
          caption: input.caption,
          transcript: input.transcript,
          niche: input.niche,
          offer: input.offerSummary,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ LLM (autopsy)");
  const autopsy = JSON.parse(content) as AutopsyPayload;
  if (!autopsy.findings || !autopsy.reshoot_script) {
    throw new Error("Autopsy JSON неполный");
  }
  return {
    autopsy,
    mocked: false,
    model: completion.model || model,
  };
}
