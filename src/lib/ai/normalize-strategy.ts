import type { GeneratedScript, StrategyPayload } from "@/lib/types";
import { VIRAL_SKELETONS } from "@/lib/ai/viral-skeletons";

export const SCRIPT_DURATIONS = [15, 30, 45] as const;

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => asString(item))
      .filter(Boolean)
      .join("\n");
    return joined || fallback;
  }
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const key of ["text", "script", "content"]) {
      if (typeof rec[key] === "string" && rec[key].trim()) {
        return String(rec[key]).trim();
      }
    }
  }
  return fallback;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  const fromArray = Array.isArray(value)
    ? value
        .map((item) => asString(item))
        .filter((item) => item.length > 0)
    : [];
  if (fromArray.length) return fromArray;
  const single = asString(value);
  if (single) return [single];
  return [...fallback];
}

export function assembleTeleprompter(input: {
  durationSec: number;
  hook?: string;
  title?: string;
  cta?: string;
}): string {
  const duration = SCRIPT_DURATIONS.includes(
    input.durationSec as (typeof SCRIPT_DURATIONS)[number],
  )
    ? input.durationSec
    : 30;
  const hook = (
    input.hook ||
    input.title ||
    "Смотрите, в чём ошибка — и как её закрыть за один дубль."
  ).trim();
  const cta = (
    input.cta || "Сохраните ролик и напишите ключевое слово в комментарии."
  ).trim();
  const mid = duration === 15 ? 8 : duration === 45 ? 22 : 16;
  const demoEnd = duration === 15 ? 12 : duration === 45 ? 38 : 24;
  return [
    `0–3с: ${hook}`,
    `3–${mid}с: Проблема вот в чём: человек уже листает, пока ты раскачиваешься.`,
    `${mid}–${demoEnd}с: Демо — один приём в кадре, без воды и без «привет».`,
    `${demoEnd}–${duration}с: ${cta}`,
  ].join("\n");
}

export function isUsableTeleprompter(text: string, durationSec: number) {
  const value = (text || "").trim();
  if (Array.from(value).length < 48) return false;
  const hasClock =
    /0\s*[–—-]\s*3/.test(value) ||
    /\[0/.test(value) ||
    /0-3/.test(value);
  if (!hasClock) return false;
  const last = value.split("\n").pop()?.trim() || "";
  if (/^[\d:.\s–—-]+$/.test(last)) return false;
  const mentionsDuration = new RegExp(String(durationSec)).test(value);
  return mentionsDuration || value.split("\n").length >= 3;
}

export function ensureTeleprompter(
  raw: unknown,
  durationSec: number,
  fallback: { hook?: string; title?: string; cta?: string },
) {
  const text = asString(raw);
  if (isUsableTeleprompter(text, durationSec)) return text;
  return assembleTeleprompter({
    durationSec,
    hook: fallback.hook,
    title: fallback.title,
    cta: fallback.cta,
  });
}

function normalizeVisualCues(raw: unknown, index: number) {
  const angle = index === 0 ? "error" : index === 1 ? "process" : "myth_or_contrast";
  const defaultCue = VIRAL_SKELETONS[angle].visualCue;
  if (!raw || typeof raw !== "object") {
    return defaultCue;
  }
  const rec = raw as Record<string, unknown>;
  return {
    start0_3s: asString(rec.start0_3s || rec.start || rec.hook, defaultCue.start0_3s),
    midAction: asString(rec.midAction || rec.mid || rec.demo, defaultCue.midAction),
    finalCta: asString(rec.finalCta || rec.final || rec.cta, defaultCue.finalCta),
  };
}

function normalizeScript(
  script: Partial<GeneratedScript> | undefined,
  index: number,
): GeneratedScript {
  const duration = SCRIPT_DURATIONS[index] ?? 30;
  const title = asString(script?.title, `Сценарий ${duration} сек`);
  const hooks = asStringArray(script?.hook_options, [
    title,
    "Одна ошибка, из‑за которой ролик умирает в первые секунды.",
    "Сделайте это в кадре — и удержание не просядет.",
  ]).slice(0, 3);
  const cta = asString(script?.cta, "Сохраните и напишите ключевое слово в комментарии.");
  return {
    title,
    format: asString(script?.format, `Reels ${duration}с`),
    duration_sec: duration,
    hook_options: hooks,
    teleprompter_script: ensureTeleprompter(script?.teleprompter_script, duration, {
      hook: hooks[0],
      title,
      cta,
    }),
    caption: asString(
      script?.caption,
      `${title}. Сохраните, чтобы снять по каркасу хук → проблема → демо → CTA.`,
    ),
    cta,
    visual_cues: normalizeVisualCues(script?.visual_cues, index),
  };
}

export function parseStrategyJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export function extractChatContent(completion: {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: unknown;
      refusal?: string | null;
    };
  }>;
}): { text: string; finishReason: string } {
  const choice = completion.choices?.[0];
  const finishReason = choice?.finish_reason || "?";
  const msg = choice?.message;
  if (!msg) return { text: "", finishReason };
  const fromContent = asString(msg.content);
  if (fromContent) return { text: fromContent, finishReason };
  const fromRefusal = asString(msg.refusal);
  return { text: fromRefusal, finishReason };
}

/**
 * Post-process LLM JSON: 15/30/45, непустой суфлёр, без второго вызова модели.
 */
export function normalizeStrategy(raw: unknown): StrategyPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("LLM JSON не содержит обязательных полей");
  }
  const parsed = raw as Partial<StrategyPayload> & Record<string, unknown>;
  const niche = asString(parsed.niche);
  const audience = asString(parsed.target_audience);
  if (!niche || !audience || !Array.isArray(parsed.content_pillars)) {
    throw new Error("LLM JSON не содержит обязательных полей");
  }

  const pillars = parsed.content_pillars
    .map((pillar) => ({
      title: asString(pillar?.title),
      description: asString(pillar?.description, asString(pillar?.title)),
    }))
    .filter((pillar) => pillar.title)
    .slice(0, 6);
  if (!pillars.length) {
    throw new Error("LLM JSON не содержит обязательных полей");
  }

  const tips = asStringArray(parsed.profile_audit_tips, [
    "Сделайте обещание в био явным: что подписчик получит на этой неделе.",
    "Закрепите ролик с лучшим удержанием и переснимите хук.",
    "Не копируйте цену в каждый ролик — оффер максимум в одном сценарии.",
  ]).slice(0, 6);

  const incoming = Array.isArray(parsed.scripts) ? parsed.scripts : [];
  const scripts = [0, 1, 2].map((index) =>
    normalizeScript(incoming[index], index),
  );

  for (const script of scripts) {
    if (!isUsableTeleprompter(script.teleprompter_script, script.duration_sec || 30)) {
      throw new Error("Не удалось собрать суфлёр для сценария");
    }
  }

  return {
    niche,
    target_audience: audience,
    content_pillars: pillars,
    profile_audit_tips: tips,
    scripts,
  };
}
