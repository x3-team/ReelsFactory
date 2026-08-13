import { sliceWords } from "@/lib/ai/safe-json";
import { isUsableTranscript } from "@/lib/ai/speech-signal";
import {
  hasScriptSignal,
  isMostlyLatin,
  rankCaptionAngles,
  type CaptionAngle,
  type ProfileInsights,
  type VisualNote,
} from "@/lib/content/profile-insights";
import type { GeneratedScript } from "@/lib/types";

const DURATIONS = [15, 30, 45] as const;
const FORMATS = ["процесс", "результат", "чеклист"] as const;
const TRAILING_PREP =
  /\s+(и|в|на|с|из|до|от|по|для|без|при|од|моих|что|как|не|но)$/i;

export type ContentMode = "talking_head" | "process_no_speech";

export function tidyCut(text: string) {
  let next = (text || "").trim().replace(/[!.?…🔥💔💚]+$/g, "").trim();
  next = next.replace(TRAILING_PREP, "").trim();
  return next;
}

function spokenBeat(transcriptions: string[] = []) {
  for (const raw of transcriptions) {
    if (!isUsableTranscript(raw)) continue;
    const sentence = raw
      .split(/[.!?…]/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .find((s) => Array.from(s).length >= 16 && !isMostlyLatin(s));
    if (!sentence) continue;
    return sliceWords(sentence.replace(/^хук:\s*/i, ""), 90);
  }
  return "";
}

export function processTeleprompter(
  hook: string,
  duration: number,
  keyword: string,
  options?: {
    contentMode?: ContentMode;
    processHint?: string;
    spokenBeat?: string;
  },
): string {
  const mid = Math.max(8, Math.round(duration * 0.55));
  const preCta = Math.max(12, duration - 4);
  const product = sliceWords(hook, 70);
  const process = sliceWords(
    options?.spokenBeat || options?.processHint || hook,
    48,
  );
  const talking = options?.contentMode === "talking_head";
  return [
    talking
      ? `0–3с: В камеру, без приветствия: «${product}»`
      : `0–3с: Крупный план. Текст на экране: «${product}»`,
    talking
      ? `3–${mid}с: ${process}. Коротко, без «привет друзья».`
      : `3–${mid}с: Крупно процесс: ${process}. Без речи в камеру.`,
    talking
      ? `${mid}–${preCta}с: Покажи результат, о котором говоришь.`
      : `${mid}–${preCta}с: Результат — крупный план того, что зритель должен запомнить.`,
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
  contentMode: ContentMode = "process_no_speech",
): string[] {
  const talking = contentMode === "talking_head";
  const fallback = [
    talking
      ? `В камеру: ${sliceWords(hook, 48)}`
      : `Крупный план: ${sliceWords(hook, 48)}`,
    visual?.process
      ? `Процесс: ${sliceWords(visual.process, 56)}`
      : talking
        ? "Покажи действие, о котором говоришь"
        : "Процесс крупным планом, без приветствия в камеру",
    talking
      ? "Крупный план результата"
      : "Результат крупным планом",
    `Текст на экране: напиши «${keyword}»`,
  ];
  if (!visual?.shotIdeas?.length) {
    if (visual?.onScreenText?.[0] && !talking) {
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
  spokenBeat?: string;
}): GeneratedScript {
  const hook = tidyCut(sliceWords(input.angle.hookLine, 72));
  const duration = input.duration;
  const keyword = input.keyword;
  const processHint =
    input.visual?.process ||
    input.visual?.onScreenText?.[0] ||
    hook;
  const talking = input.contentMode === "talking_head";
  const variants = [
    hook,
    talking
      ? tidyCut(`Скажи в камеру: ${sliceWords(hook, 42)}`)
      : tidyCut(`Крупный план: ${sliceWords(hook, 48)}`),
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
      spokenBeat: input.spokenBeat,
    }),
    caption: `${hook}. Напиши «${keyword}» в комментариях — пришлю материал.`,
    cta: `Напиши ${keyword} в комментариях`,
    source_angle: hook,
    shot_list: shotsFromFact(hook, keyword, input.visual, input.contentMode),
    props_checklist: uniqueKeepOrder([
      "штатив",
      input.visual?.product
        ? sliceWords(input.visual.product, 40)
        : talking
          ? "готовая мысль на 3 секунды"
          : "готовая деталь для крупного плана",
    ]),
  };
}

export function pickAngles(insights: ProfileInsights): CaptionAngle[] {
  const ranked = rankCaptionAngles(
    insights.captionAngles || [],
    insights.visualNotes || [],
  );
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
  options?: { transcriptions?: string[] },
): GeneratedScript[] {
  const angles = pickAngles(insights);
  if (!angles.length || !hasScriptSignal(insights)) return [];
  const notes = insights.visualNotes || [];
  const beat = spokenBeat(options?.transcriptions || []);

  return DURATIONS.map((duration, index) => {
    const angle = angles[index] || angles[index % angles.length];
    return scriptFromFact({
      angle,
      visual: noteForAngle(angle, notes) || (index === 0 ? notes[0] : undefined),
      index,
      duration,
      keyword,
      contentMode,
      spokenBeat: beat,
    });
  });
}
