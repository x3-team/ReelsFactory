import {
  getAiTunnelClient,
  llmModelForPlan,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { rankHooks } from "@/lib/ai/score-hooks";

const HOOKS_SYSTEM = `Ты сценарист коротких видео для РФ/СНГ.
Верни ТОЛЬКО JSON: {"hook_options": string[3]} — первые 3 секунды ролика на русском.

Правила: ровно 3 варианта, каждый до 12 слов; три разных угла — боль, любопытство, результат;
без приветствий, без «в этом видео», без обещаний охватов; не повторяй текущие хуки.`;

const MOCK_HOOKS = [
  "Три секунды — и зритель решает, смотреть ли дальше.",
  "Одна привычка в кадре, из-за которой досмотры падают.",
  "Проверьте первую фразу — обычно проблема именно в ней.",
];

export async function regenerateHooks(input: {
  title: string;
  format: string;
  niche?: string | null;
  currentHooks: string[];
  teleprompterScript: string;
  plan?: string | null;
}): Promise<{ hooks: string[]; mocked: boolean; model: string }> {
  const model = llmModelForPlan(input.plan);

  if (shouldUseMockAi()) {
    return { hooks: rankHooks(MOCK_HOOKS), mocked: true, model: "mock" };
  }

  const openai = getAiTunnelClient();
  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    max_tokens: 500,
    temperature: 0.9,
    messages: [
      { role: "system", content: HOOKS_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          title: input.title,
          format: input.format,
          niche: input.niche,
          current_hooks: input.currentHooks,
          teleprompter_preview: input.teleprompterScript.slice(0, 400),
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as { hook_options?: unknown };
  const hooks = Array.isArray(parsed.hook_options)
    ? parsed.hook_options
        .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
        .slice(0, 3)
    : [];

  if (hooks.length < 3) {
    throw new Error("Модель вернула меньше трёх хуков");
  }

  return { hooks: rankHooks(hooks), mocked: false, model };
}
