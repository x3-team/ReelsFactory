import {
  getAiTunnelClient,
  llmModelForStrategy,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";

/** Turn a voice/idea dump into a clean brief for strategy / remake */
export async function polishVoiceDraft(input: {
  rawText: string;
  nichePreset?: string | null;
  plan?: string | null;
}): Promise<{ polished: string; mocked: boolean }> {
  const raw = input.rawText.trim();
  if (!raw) return { polished: "", mocked: true };

  if (shouldUseMockAi()) {
    return {
      polished: `Идея автора: ${raw.slice(0, 280)}. Сфокусировать на боли аудитории и мягком CTA.`,
      mocked: true,
    };
  }

  const model = llmModelForStrategy(input.plan);
  const openai = getAiTunnelClient();
  const completion = await openai.chat.completions.create({
    model,
    max_tokens: 600,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Сжать голосовой/сырой черновик автора в 2–4 предложения брифа для сценариста Reels (RU). Без воды.",
      },
      {
        role: "user",
        content: JSON.stringify({
          raw,
          niche_preset: input.nichePreset,
        }),
      },
    ],
  });

  const polished = completion.choices[0]?.message?.content?.trim() || raw;
  return { polished, mocked: false };
}
