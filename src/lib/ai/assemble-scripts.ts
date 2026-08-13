import { sliceWords } from "@/lib/ai/safe-json";
import {
  isWeakAngle,
  type CaptionAngle,
  type ProfileInsights,
  type VisualNote,
} from "@/lib/content/profile-insights";
import type { GeneratedScript } from "@/lib/types";

const DURATIONS = [15, 30, 45] as const;
const FORMATS = ["процесс", "результат", "чеклист"] as const;
const TRAILING_PREP =
  /\s+(и|в|на|с|из|до|от|по|для|без|при|од|моих)$/i;

export type ContentMode = "talking_head" | "process_no_speech";

export function tidyCut(text: string) {
  let next = (text || "").trim().replace(/[!.?…🔥💔💚]+$/g, "").trim();
  next = next.replace(TRAILING_PREP, "").trim();
  return next;
}

export function processTeleprompter(
  hook: string,
  duration: number,
  keyword: string,
  options?: {
    contentMode?: ContentMode;
    processHint?: string;
  },
): string {
  const mid = Math.max(8, Math.round(duration * 0.55));
  const preCta = Math.max(12, duration - 4);
  const product = sliceWords(hook, 70);
  const process = sliceWords(options?.processHint || hook, 48);
  const talking = options?.contentMode === "talking_head";
  return [
    talking
      ? `0–3с: В кадр: «${product}»`
      : `0–3с: Крупный план. Текст на экране: «${product}»`,
    talking
      ? `3–${mid}с: Покажи процесс: ${process}. Коротко, без приветствия.`
      : `3–${mid}с: Крупно процесс: ${process}. Без речи в камеру.`,
    `${mid}–${preCta}с: Результат — крупный план того, что зритель должен запомнить.`,
    `${preCta}–${duration}с: Надпись: «Напиши ${keyword} в комментарии».`,
  ].join("\n");
}

function uniqueKeepOrder(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function angleKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 4)
    .join(" ");
}

function shotsFromFact(
  hook: string,
  keyword: string,
  visual?: VisualNote | null,
): string[] {
  const fallback = [
    `Крупный план: ${sliceWords(hook, 48)}`,
    visual?.process
      ? `Процесс: ${sliceWords(visual.process, 56)}`
      : "Процесс крупным планом, без приветствия в камеру",
    "Результат крупным планом",
    `Текст на экране: напиши «${keyword}»`,
  ];
  if (!visual?.shotIdeas?.length) {
    if (visual?.onScreenText?.[0]) {
      fallback[0] = `Крупный план: ${sliceWords(visual.onScreenText[0], 48)}`;
    }
    return fallback;
  }
  return uniqueKeepOrder([...visual.shotIdeas, ...fallback]).slice(0, 4);
}

function noteForAngle(
  angle: CaptionAngle,
  notes: VisualNote[],
): VisualNote | undefined {
  if (angle.id) {
    const hit = notes.find((n) => n.videoId === angle.id);
    if (hit) return hit;
  }
  const key = angleKey(angle.hookLine);
  if (!key) return undefined;
  return notes.find((n) => {
    const blob = `${n.product} ${n.process} ${n.onScreenText.join(" ")}`.toLowerCase();
    const words = key.split(" ");
    return words.filter((w) => blob.includes(w)).length >= 2;
  });
}

export function scriptFromFact(input: {
  angle: { id?: string; hookLine: string; caption?: string; views?: number };
  visual?: VisualNote | null;
  index: number;
  duration: number;
  keyword: string;
  contentMode?: ContentMode;
}): GeneratedScript {
  const hook = tidyCut(sliceWords(input.angle.hookLine, 72));
  const duration = input.duration;
  const keyword = input.keyword;
  const processHint =
    input.visual?.process ||
    input.visual?.onScreenText?.[0] ||
    hook;
  const variants = [
    hook,
    tidyCut(`Крупный план: ${sliceWords(hook, 48)}`),
    "Сохрани, если будешь повторять",
  ];
  return {
    title: tidyCut(sliceWords(hook, 56)) || `Ролик ${duration}с`,
    format: FORMATS[input.index % FORMATS.length],
    duration_sec: duration,
    shoot_order: input.index + 1,
    comment_keyword: keyword,
    hook_options: variants.map((h) => sliceWords(h, 72)),
    teleprompter_script: processTeleprompter(hook, duration, keyword, {
      contentMode: input.contentMode,
      processHint,
    }),
    caption: `${hook}. Напиши «${keyword}» в комментариях — пришлю материал.`,
    cta: `Напиши ${keyword} в комментариях`,
    source_angle: hook,
    shot_list: shotsFromFact(hook, keyword, input.visual),
    props_checklist: uniqueKeepOrder([
      "штатив",
      input.visual?.product
        ? sliceWords(input.visual.product, 40)
        : "готовая деталь для крупного плана",
    ]),
  };
}

function pickAngles(insights: ProfileInsights): CaptionAngle[] {
  const ranked = [...(insights.captionAngles || [])].sort((a, b) => {
    const weakA = isWeakAngle(a.hookLine) ? 1 : 0;
    const weakB = isWeakAngle(b.hookLine) ? 1 : 0;
    if (weakA !== weakB) return weakA - weakB;
    return (b.views || 0) - (a.views || 0);
  });
  const picked: CaptionAngle[] = [];
  const seen = new Set<string>();
  for (const angle of ranked) {
    const key = angleKey(angle.hookLine);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    picked.push(angle);
    if (picked.length >= 3) break;
  }
  return picked;
}

/**
 * Scripts are a fact card + 4 shots + a teleprompter template.
 * LLM must not author the sufler or shot list.
 */
export function assembleScriptsFromFacts(
  insights: ProfileInsights,
  keyword: string,
  contentMode: ContentMode = "process_no_speech",
): GeneratedScript[] {
  const angles = pickAngles(insights);
  const notes = insights.visualNotes || [];
  const fallback: CaptionAngle = {
    id: "fallback",
    views: 0,
    hookLine: insights.products[0] || "Процесс из профиля",
    caption: insights.bioExcerpt || "",
  };

  return DURATIONS.map((duration, index) =>
    scriptFromFact({
      angle: angles[index] || fallback,
      visual: angles[index] ? noteForAngle(angles[index], notes) : notes[0],
      index,
      duration,
      keyword,
      contentMode,
    }),
  );
}
