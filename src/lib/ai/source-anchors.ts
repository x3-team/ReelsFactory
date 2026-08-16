import type { GeneratedScript, StrategyPayload } from "@/lib/types";

/** Первая строка tips, если голос не разобрали. */
export const VOICE_MISSING_TIP =
  "Голос роликов не разобрали — сценарии собраны по подписям, не «как будто слышали» речь. Когда появится звук, переснимите хук с фразы из кадра.";

const STOPWORDS = new Set(
  [
    "этот",
    "эта",
    "эти",
    "это",
    "того",
    "этого",
    "быть",
    "есть",
    "был",
    "была",
    "были",
    "будет",
    "если",
    "когда",
    "чтобы",
    "можно",
    "нужно",
    "просто",
    "очень",
    "также",
    "только",
    "даже",
    "после",
    "перед",
    "здесь",
    "сейчас",
    "сегодня",
    "завтра",
    "смотри",
    "слушай",
    "стоп",
    "дальше",
    "сначала",
    "потом",
    "давай",
    "привет",
    "сразу",
    "пока",
    "значит",
    "поэтому",
    "потому",
    "тогда",
    "всегда",
    "иногда",
    "лучше",
    "ролик",
    "видео",
    "рилс",
    "рилса",
    "сценарий",
    "хуки",
    "демо",
    "проблема",
    "секунд",
    "камера",
    "подпис",
    "коммент",
    "сохрани",
    "напиши",
    "поставь",
    "лайк",
    "шапке",
    "профиля",
    "сайте",
    "ссылке",
    "купить",
    "стоит",
    "рублей",
    "рубль",
    "видеоурок",
    "обучения",
    "обучение",
    "подробная",
    "технологическая",
    "карта",
    "рецептами",
    "рецептов",
    "обратной",
    "связи",
    "формат",
    "текстовый",
    "книга",
    "подарок",
    "описание",
    "которые",
    "который",
    "которая",
    "человек",
    "люди",
    "много",
    "больше",
    "меньше",
    "такой",
    "такая",
    "такие",
    "свой",
    "свои",
    "весь",
    "всех",
    "меня",
    "тебе",
    "вам",
    "нас",
    "них",
    "себя",
    "приготовить",
    "приготовлению",
    "сделать",
    "получается",
    "получился",
    "смотреть",
    "поделиться",
    "подборку",
  ].map((word) => word.replace(/ё/g, "е")),
);

const COMMERCIAL_NUMBERS = new Set(["1300", "1800", "2100", "2300"]);

export class SourceAnchorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceAnchorError";
  }
}

export function profileLooksCyrillic(texts: string[]): boolean {
  const blob = texts.join(" ");
  const cyr = (blob.match(/[а-яё]/gi) || []).length;
  const lat = (blob.match(/[a-z]/gi) || []).length;
  return cyr >= 20 && cyr >= lat;
}

export function isUsableVoiceText(
  text: string,
  opts?: { expectCyrillic?: boolean },
): boolean {
  const value = (text || "").trim();
  if (value.length < 8) return false;
  if (/thank you for watching|like and subscribe|subscribe to (my )?channel/i.test(value)) {
    return false;
  }
  if (/チャンネル登録|登録をお願い/.test(value)) return false;
  const cjk = (value.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
  const cyr = (value.match(/[а-яё]/gi) || []).length;
  const lat = (value.match(/[a-z]/gi) || []).length;
  if (cjk > cyr + lat) return false;
  if (opts?.expectCyrillic && value.length >= 12 && cyr === 0) return false;
  return true;
}

export function usableTranscriptions(
  transcriptions: string[] | null | undefined,
  captionsAndBio: string[],
): string[] {
  const expectCyrillic = profileLooksCyrillic(captionsAndBio);
  return (transcriptions || [])
    .map((item) => item.trim())
    .filter((item) => isUsableVoiceText(item, { expectCyrillic }));
}

export function sourceCorpus(input: {
  bio?: string | null;
  captions?: string[] | null;
  transcriptions?: string[] | null;
}): { voiceHeard: boolean; texts: string[]; usableVoice: string[] } {
  const captions = (input.captions || []).map((item) => item.trim()).filter(Boolean);
  const bio = (input.bio || "").trim();
  const captionSide = [bio, ...captions].filter(Boolean);
  const usableVoice = usableTranscriptions(input.transcriptions, captionSide);
  return {
    voiceHeard: usableVoice.length > 0,
    texts: [...usableVoice, ...captionSide],
    usableVoice,
  };
}

export function normalizeToken(raw: string): string {
  return raw.toLowerCase().replace(/ё/g, "е").replace(/#/g, "");
}

export function stemToken(token: string): string {
  const value = normalizeToken(token);
  if (value.length <= 5) return value;
  if (value.length <= 7) return value.slice(0, 5);
  return value.slice(0, 6);
}

function isContentToken(token: string): boolean {
  const value = normalizeToken(token);
  if (value.length < 5) return false;
  if (STOPWORDS.has(value)) return false;
  if (COMMERCIAL_NUMBERS.has(value)) return false;
  if (/^\d+$/.test(value) && value.length <= 4) return false;
  return true;
}

export function contentTokens(text: string): string[] {
  return normalizeToken(text || "")
    .split(/[^a-zа-я0-9]+/)
    .filter(isContentToken);
}

export function contentStems(text: string): Set<string> {
  return new Set(contentTokens(text).map(stemToken));
}

export function extractAnchorPhrases(texts: string[]): string[] {
  const blob = texts.join("\n");
  const phrases: string[] = [];
  const quoted = blob.match(/«[^»]{4,80}»/g) || [];
  for (const item of quoted) {
    const clean = item.replace(/[«»]/g, "").trim();
    if (clean && !phrases.includes(clean)) phrases.push(clean);
  }
  const ranked = contentTokens(blob)
    .filter((token) => token.length >= 6)
    .sort((a, b) => b.length - a.length || a.localeCompare(b, "ru"));
  const seen = new Set(phrases.map((item) => stemToken(item.split(/\s+/)[0] || item)));
  for (const token of ranked) {
    const key = stemToken(token);
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(token);
    if (phrases.length >= 20) break;
  }
  return phrases.slice(0, 20);
}

function stemSet(tokens: string[]): Set<string> {
  return new Set(tokens.map(stemToken));
}

export function scriptStrongStems(
  script: Pick<GeneratedScript, "title" | "hook_options" | "teleprompter_script" | "caption">,
  sourceTexts: string[],
): Set<string> {
  return stemSet(
    scriptSourceHits(script, sourceTexts).filter(
      (token) => token.length >= 7 || /^\d/.test(token),
    ),
  );
}

export function assertDistinctScriptAnchors(
  strategy: StrategyPayload,
  sourceTexts: string[],
): void {
  const sets = strategy.scripts.map((script) => scriptStrongStems(script, sourceTexts));
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const left = sets[i]!;
      const right = sets[j]!;
      if (left.size === 0 || right.size === 0) continue;
      const inter = [...left].filter((item) => right.has(item));
      const union = new Set([...left, ...right]);
      if (inter.length >= 3 && inter.length / union.size >= 0.45) {
        throw new SourceAnchorError(
          `Сценарии ${strategy.scripts[i]?.duration_sec}с и ${strategy.scripts[j]?.duration_sec}с повторяют один продукт (${inter.slice(0, 6).join(", ")}). Возьми разные якоря из source_anchors.`,
        );
      }
    }
  }
}

export function scriptSourceHits(
  script: Pick<GeneratedScript, "title" | "hook_options" | "teleprompter_script" | "caption">,
  sourceTexts: string[],
): string[] {
  const sourceStems = contentStems(sourceTexts.join("\n"));
  const scriptText = [
    script.title,
    ...(script.hook_options || []),
    script.teleprompter_script,
    script.caption,
  ].join("\n");
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const token of contentTokens(scriptText)) {
    const key = stemToken(token);
    if (!sourceStems.has(key) || seen.has(key)) continue;
    seen.add(key);
    hits.push(token);
  }
  return hits;
}

export function scriptHasSourceAnchor(
  script: Pick<GeneratedScript, "title" | "hook_options" | "teleprompter_script" | "caption">,
  sourceTexts: string[],
): { ok: boolean; hits: string[] } {
  if (!sourceTexts.some((item) => item.trim())) {
    return { ok: true, hits: [] };
  }
  const hits = scriptSourceHits(script, sourceTexts);
  const strong = hits.filter((token) => token.length >= 7 || /^\d/.test(token));
  const medium = hits.filter((token) => token.length >= 6);
  const ok = strong.length >= 1 || medium.length >= 2;
  return { ok, hits };
}

export function assertStrategyAnchored(
  strategy: StrategyPayload,
  sourceTexts: string[],
): void {
  if (!sourceTexts.some((item) => item.trim())) return;
  const failed: string[] = [];
  for (const script of strategy.scripts) {
    const { ok, hits } = scriptHasSourceAnchor(script, sourceTexts);
    if (!ok) {
      failed.push(
        `«${script.title}» (${script.duration_sec || "?"}с, пересечений=${hits.length})`,
      );
    }
  }
  if (failed.length) {
    throw new SourceAnchorError(
      `Сценарий без якоря из транскрипта/подписи: ${failed.join("; ")}. Нужен термин, цифра, ошибка или продукт профиля.`,
    );
  }
  assertDistinctScriptAnchors(strategy, sourceTexts);
  assertNoUngroundedTerms(strategy, sourceTexts);
}

const UNGROUNDED_TERMS = ["сироп", "завиток", "агар", "термометр"] as const;

export function assertNoUngroundedTerms(
  strategy: StrategyPayload,
  sourceTexts: string[],
): void {
  const blob = sourceTexts.join("\n");
  if (blob.length < 800) return;
  const source = normalizeToken(blob);
  const stems = contentStems(blob);
  for (const script of strategy.scripts) {
    const text = normalizeToken(
      `${script.title}\n${script.teleprompter_script}\n${(script.hook_options || []).join("\n")}`,
    );
    for (const term of UNGROUNDED_TERMS) {
      if (!text.includes(term)) continue;
      if (source.includes(term) || stems.has(stemToken(term))) continue;
      throw new SourceAnchorError(
        `Сценарий «${script.title}» выдумал «${term}», которого нет в транскрипте/подписях.`,
      );
    }
  }
}

export function withVoiceHeardTip(
  strategy: StrategyPayload,
  voiceHeard: boolean,
): StrategyPayload {
  if (voiceHeard) return strategy;
  const already = strategy.profile_audit_tips.some((tip) =>
    /голос|подпис|whisper|не разобр/i.test(tip),
  );
  const tips = already
    ? strategy.profile_audit_tips
    : [VOICE_MISSING_TIP, ...strategy.profile_audit_tips].slice(0, 6);
  return { ...strategy, profile_audit_tips: tips };
}
