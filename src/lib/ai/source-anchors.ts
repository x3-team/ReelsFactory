import type { GeneratedScript, StrategyPayload } from "@/lib/types";
import {
  VOICE_MISSING_TIP,
  WEAK_SOURCE_TIP,
} from "@/lib/ai/honesty-copy";

export { VOICE_MISSING_TIP, WEAK_SOURCE_TIP, shouldShowVoiceBanner } from "@/lib/ai/honesty-copy";

export type CaptionSourceStrength = "empty" | "weak" | "ok";

const MOCK_FALLBACK_MARKERS =
  /ролик умирает после тр[её]х секунд|удар в первой фразе, потом доказательство|люди пишут слово в комментарии, если ты просишь/i;

const VOICE_JUNK =
  /thank you for watching|like and subscribe|subscribe to (my )?channel|チャンネル登録|登録をお願い|go for the ride|drop top|switching lanes|hey,\s*hey|♪|\[lyrics\]|\blyrics\b|\bchorus\b/i;

const OVEN_CARD = /\d+\s*°\s*[cf]\b|\d+\s*[-–—]\s*\d+\s*分/i;

const SOURCE_HYPE =
  /стратег\w*\s+огонь|контент\s+огонь|вирусн|контент-машин|сильн(ая|ые|ый)\s+(стратег|контент|тем)/i;

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
  opts?: { expectCyrillic?: boolean; sourceStems?: Set<string> },
): boolean {
  const value = (text || "").trim();
  if (value.length < 8) return false;
  if (value === "." || /^[.…,!?]+$/.test(value)) return false;
  if (MOCK_FALLBACK_MARKERS.test(value)) return false;
  if (VOICE_JUNK.test(value)) return false;
  if (OVEN_CARD.test(value) && !/[а-яё]/i.test(value)) return false;
  const cjk = (value.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
  const cyr = (value.match(/[а-яё]/gi) || []).length;
  const lat = (value.match(/[a-z]/gi) || []).length;
  if (cjk > cyr + lat) return false;
  if (opts?.expectCyrillic && value.length >= 12 && cyr === 0) return false;
  if (cyr === 0 && lat >= 24 && /ride|girl|baby|night|love|dance|party/i.test(value)) {
    return false;
  }
  if (opts?.sourceStems && opts.sourceStems.size >= 6) {
    const stems = contentStems(value);
    if (stems.size >= 4) {
      const overlap = [...stems].filter((stem) => opts.sourceStems!.has(stem)).length;
      if (overlap === 0) return false;
    }
  }
  return true;
}

export function usableTranscriptions(
  transcriptions: string[] | null | undefined,
  captionsAndBio: string[],
): string[] {
  const expectCyrillic = profileLooksCyrillic(captionsAndBio);
  const sourceStems = contentStems(captionsAndBio.join("\n"));
  return (transcriptions || [])
    .map((item) => item.trim())
    .filter((item) => isUsableVoiceText(item, { expectCyrillic, sourceStems }));
}

function normalizeCaptionKey(text: string) {
  return (text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/@[\w.]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function captionSourceStrength(input: {
  bio?: string | null;
  captions?: string[] | null;
}): CaptionSourceStrength {
  const captions = (input.captions || []).map((item) => item.trim()).filter(Boolean);
  const bio = (input.bio || "").trim();
  const unique = new Set(captions.map(normalizeCaptionKey).filter((item) => item.length >= 12));
  const uniqueTokens = contentStems(captions.join("\n"));
  if (captions.length === 0 && bio.length < 40) return "empty";
  if (captions.length >= 3 && unique.size <= 1) return "weak";
  if (uniqueTokens.size < 8 && bio.length < 160) return "weak";
  const hashtagOnly = captions.filter((caption) => {
    const stripped = caption
      .replace(/#[\p{L}\p{N}_]+/gu, " ")
      .replace(/@[\w.]+/g, " ")
      .trim();
    return contentTokens(stripped).length < 3;
  }).length;
  if (captions.length >= 3 && hashtagOnly / captions.length >= 0.7 && uniqueTokens.size < 14) {
    return "weak";
  }
  return "ok";
}

export function normalizeUserFacts(facts?: string[] | null): string[] {
  const unique: string[] = [];
  for (const raw of facts || []) {
    const value = (raw || "").replace(/\s+/g, " ").trim();
    if (value.length < 8) continue;
    if (unique.some((item) => item.toLowerCase() === value.toLowerCase())) continue;
    unique.push(value);
    if (unique.length >= 5) break;
  }
  return unique;
}

export function hasEnoughUserFacts(input: {
  facts?: string[] | null;
  offerSummary?: string | null;
}): boolean {
  if (normalizeUserFacts(input.facts).length >= 3) return true;
  const offer = (input.offerSummary || "").trim();
  return offer.length >= 48 && contentStems(offer).size >= 8;
}

/** Слабые/пустые подписи без 3 фактов — не выдаём «готовый» суфлёр. */
export function shouldPauseForFacts(input: {
  strength: CaptionSourceStrength;
  facts?: string[] | null;
  offerSummary?: string | null;
}): boolean {
  if (input.strength === "ok") return false;
  return !hasEnoughUserFacts(input);
}

export function sourceCorpus(input: {
  bio?: string | null;
  captions?: string[] | null;
  transcriptions?: string[] | null;
  extraFacts?: string[] | null;
  offerSummary?: string | null;
}): {
  voiceHeard: boolean;
  texts: string[];
  usableVoice: string[];
  strength: CaptionSourceStrength;
} {
  const captions = (input.captions || []).map((item) => item.trim()).filter(Boolean);
  const bio = (input.bio || "").trim();
  const extra = [
    ...(input.offerSummary ? [input.offerSummary] : []),
    ...normalizeUserFacts(input.extraFacts),
  ];
  const captionSide = [bio, ...captions].filter(Boolean);
  const usableVoice = usableTranscriptions(input.transcriptions, captionSide);
  return {
    voiceHeard: usableVoice.length > 0,
    texts: [...usableVoice, ...captionSide, ...extra],
    usableVoice,
    strength: captionSourceStrength({ bio, captions }),
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
  strength: CaptionSourceStrength = "ok",
): void {
  if (strength !== "ok") return;
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
  strength: CaptionSourceStrength = "ok",
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
  assertDistinctScriptAnchors(strategy, sourceTexts, strength);
  assertNoUngroundedTerms(strategy, sourceTexts);
  assertNoHypeWhenWeak(strategy, strength);
  assertLowInventionWhenWeak(strategy, sourceTexts, strength);
}

const UNGROUNDED_TERMS = [
  "сироп",
  "завиток",
  "агар",
  "термометр",
  "суперсет",
  "калорийн",
  "эскроу",
] as const;

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

export function scriptNovelStems(
  script: Pick<GeneratedScript, "title" | "hook_options" | "teleprompter_script" | "caption">,
  sourceTexts: string[],
): string[] {
  const source = contentStems(sourceTexts.join("\n"));
  const text = [
    script.title,
    ...(script.hook_options || []),
    script.teleprompter_script,
    script.caption,
  ].join("\n");
  const seen = new Set<string>();
  const novel: string[] = [];
  for (const token of contentTokens(text)) {
    if (token.length < 7) continue;
    const key = stemToken(token);
    if (source.has(key) || seen.has(key)) continue;
    seen.add(key);
    novel.push(token);
  }
  return novel;
}

export function assertLowInventionWhenWeak(
  strategy: StrategyPayload,
  sourceTexts: string[],
  strength: CaptionSourceStrength,
): void {
  if (strength === "ok") return;
  for (const script of strategy.scripts) {
    const novel = scriptNovelStems(script, sourceTexts);
    if (novel.length >= 3) {
      throw new SourceAnchorError(
        `Сценарий «${script.title}» выдумал детали (${novel.slice(0, 6).join(", ")}), которых нет в коротких/одинаковых подписях.`,
      );
    }
  }
}

export function assertNoHypeWhenWeak(
  strategy: StrategyPayload,
  strength: CaptionSourceStrength,
): void {
  if (strength === "ok") return;
  const blob = `${strategy.niche}\n${strategy.profile_audit_tips.join("\n")}`;
  if (SOURCE_HYPE.test(blob)) {
    throw new SourceAnchorError(
      "Подписи слабые — нельзя выдавать «стратегию огонь» или вирусный контент-план.",
    );
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

export function withSourceHonestyTips(
  strategy: StrategyPayload,
  input: { voiceHeard: boolean; strength: CaptionSourceStrength },
): StrategyPayload {
  const withVoice = withVoiceHeardTip(strategy, input.voiceHeard);
  if (input.strength === "ok") return withVoice;
  const already = withVoice.profile_audit_tips.some((tip) =>
    /копипаст|стратегия огонь|подписи пустые/i.test(tip),
  );
  if (already) return withVoice;
  return {
    ...withVoice,
    profile_audit_tips: [WEAK_SOURCE_TIP, ...withVoice.profile_audit_tips].slice(0, 6),
  };
}
