import { sliceChars, sliceWords } from "@/lib/ai/safe-json";
import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";
import { normalizeKeyword } from "@/lib/comment-keyword";

const GENERIC_TAGS = new Set(
  [
    "reels",
    "reel",
    "reelsinstagram",
    "viral",
    "fyp",
    "контент",
    "москва",
    "москве",
    "россия",
    "рек",
    "рекомендации",
    "shorts",
    "instagram",
    "instagood",
    "explore",
    "trend",
    "тренды",
  ].map((s) => s.toLowerCase()),
);

export function priceRe() {
  return /\d[\d\s]{0,8}\s*(₽|руб(?:\.|лей|ля|ль)?)/gi;
}

export type CaptionAngle = {
  id: string;
  views: number;
  hookLine: string;
  caption: string;
};

export type FactCard = {
  allowed: string[];
  withoutClaims: string[];
  blob: string;
};

export type VisualNote = {
  videoId: string;
  onScreenText: string[];
  product: string;
  process: string;
  talkingHead: boolean;
  shotIdeas: string[];
};

export type ProfileInsights = {
  products: string[];
  prices: string[];
  hasWebsiteCta: boolean;
  hasTelegramCta: boolean;
  voiceSamples: string[];
  captionAngles: CaptionAngle[];
  suggestedKeyword: string;
  bioExcerpt: string;
  avgCaptionChars: number;
  factCard: FactCard;
  visualNotes: VisualNote[];
};

function allCaptions(profile: ScrapedProfile): string[] {
  const fromPool = (profile.recentCaptions || []).filter(Boolean);
  const fromVideos = (profile.topVideos || []).map((v) => v.caption || "");
  const merged = [...fromPool, ...fromVideos];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of merged) {
    const t = raw.replace(/\s+/g, " ").trim();
    if (t.length < 12) continue;
    const key = sliceChars(t, 80).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
  }
  return out.slice(0, 24);
}

function stripDecor(text: string) {
  return text
    .replace(/#\S+/g, " ")
    .replace(priceRe(), " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const REACTION_ONLY =
  /^(обожаю|медитация|и такое бывает|этот хруст|смешно получилось|готова есть|эти звуки|любимые батончики|осталось немного|как думаете)/i;

const PRODUCT_HINT =
  /зефир|мармелад|бенто|маршмеллоу|трюфел|шоколад|птичь|фисташк|малин|мятн|клубник|карамел|мороженое|сироп|торт|конфет|мадлен|плитк/i;

export function isReactionHook(text: string) {
  const t = stripDecor(text || "").trim();
  if (!t) return true;
  if (PRODUCT_HINT.test(t)) return false;
  if (REACTION_ONLY.test(t)) return true;
  // Two real RU words are a pasted caption, not a reaction crumb.
  // Otherwise "колодец под ключ" dies and we pretend there was nothing to write.
  const words = t.split(/\s+/).filter((w) => /[А-Яа-яЁё]{3,}/.test(w));
  if (words.length >= 2) return false;
  return Array.from(t).length < 18;
}

export function isTruncatedAngle(text: string) {
  const t = (text || "").trim();
  if (!t) return true;
  return /\s+(и|в|на|с|из|до|от|по|для|без|при|од|моих|что|как|не|но)$/i.test(t);
}

export function isMostlyLatin(text: string) {
  const t = stripDecor(text || "");
  const cyr = (t.match(/[А-Яа-яЁё]/g) || []).length;
  const lat = (t.match(/[A-Za-z]/g) || []).length;
  if (lat < 8) return false;
  return cyr < 8 && lat >= Math.max(8, cyr * 2);
}

/** Thai / CJK / Arabic / Hangul / Latin-only copy. Product is RU/CIS-only. */
const FOREIGN_SCRIPTS =
  /[\u3040-\u30ff\u3400-\u9fff\u0E00-\u0E7F\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u1100-\u11FF\uAC00-\uD7AF]/g;

export function isNonRussianCopy(text: string) {
  const t = stripDecor(text || "");
  if (!t) return false;
  const cyr = (t.match(/[А-Яа-яЁё]/g) || []).length;
  const foreign = (t.match(FOREIGN_SCRIPTS) || []).length;
  if (foreign >= 4 && cyr < 10) return true;
  return isMostlyLatin(text);
}

const THEME_BAGS: { id: string; re: RegExp }[] = [
  {
    id: "food",
    re: /торт|десерт|рецепт|зефир|мармелад|маршмеллоу|шоколад|кондитер|выпечк|готовить|кухня|еда\b|гастроном/i,
  },
  {
    id: "beauty",
    re: /макияж|косметик|бров|помад|кожа|уход за|причёск|ресниц|бьюти|визаж/i,
  },
  {
    id: "psych",
    re: /психолог|отношен|принят|дискомфорт|травм|женственност|самоцен|тревог|границ|отозвалось/i,
  },
  {
    id: "fitness",
    re: /тренир|фитнес|жгут|планка|ягодиц|пресс|качалк|растяжк|упражнен/i,
  },
  {
    id: "fashion",
    re: /пальто|кимоно|парка|гардероб|стилист|ателье|кашемир/i,
  },
  {
    id: "interior",
    re: /интерьер|ремонт|квартир|ванная|двушк|румтур/i,
  },
];

function bagsIn(text: string) {
  const t = text || "";
  return THEME_BAGS.filter((b) => b.re.test(t)).map((b) => b.id);
}

function videoThemeBags(insights: ProfileInsights) {
  return (insights.captionAngles || []).map((a) =>
    bagsIn(`${a.hookLine} ${a.caption}`),
  );
}

export function preferredTheme(insights: ProfileInsights): string | null {
  const bioBags = bagsIn(insights.bioExcerpt || "");
  const perVideo = videoThemeBags(insights);
  const videoCounts = new Map<string, number>();
  for (const bags of perVideo) {
    for (const id of new Set(bags)) {
      videoCounts.set(id, (videoCounts.get(id) || 0) + 1);
    }
  }
  const bioInVideos = bioBags
    .map((id) => ({ id, n: videoCounts.get(id) || 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  if (bioInVideos[0]) return bioInVideos[0].id;

  let best: string | null = null;
  let bestN = 0;
  for (const [id, n] of videoCounts) {
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  if (bestN >= 2) return best;
  return bioBags[0] || best;
}

export function isOfftopicAngle(
  angle: CaptionAngle,
  insights: ProfileInsights,
) {
  const theme = preferredTheme(insights);
  if (!theme) return false;
  const bags = bagsIn(`${angle.hookLine} ${angle.caption}`);
  if (!bags.length) return false;
  return !bags.includes(theme);
}

export function isPromoAngle(text: string) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (
    /подписыва\w*/i.test(t) &&
    /(тик\s*ток|tiktok|ютуб|youtube|\bтгк\b|телеграм|канал)/i.test(t)
  ) {
    return true;
  }
  if (
    /в мо[её]м телеграм|телеграм-канал вас ждут|ждут другие рецепты|другие рецепты и советы/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /смотрите на youtube|youtube и vk|новый выпуск .*(youtube|ютуб|vk видео)/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/поздравляем нашего победителя/i.test(t)) return true;
  if (/сотрудничество:|ссылка в шапк|мой тгк/i.test(t)) return true;
  return false;
}

export function isWeakAngle(text: string) {
  const t = (text || "").trim();
  if (isReactionHook(t)) return true;
  if (isTruncatedAngle(t)) return true;
  if (isPromoAngle(t)) return true;
  if (/^[-–—•]\s*/.test(t)) return true;
  if (/\d{1,2}:\d{2}/.test(t) && (t.match(/[А-Яа-яЁё]{4,}/g) || []).length <= 1) {
    return true;
  }
  if (
    /технологическ|обучение можно|купить на сайте|ссылк\w* в шапк|урок по |бонусом от меня|в тк добавлен/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

export function hasProfileMedia(profile: ScrapedProfile) {
  return (profile.topVideos || []).length > 0;
}

export function scoreCaptionAngle(
  angle: CaptionAngle,
  notes: VisualNote[] = [],
  insights?: ProfileInsights,
) {
  const hook = angle.hookLine || "";
  let score = Math.log10((angle.views || 0) + 10);
  if (isWeakAngle(hook)) score -= 25;
  if (isNonRussianCopy(hook)) score -= 18;
  else if ((hook.match(/[А-Яа-яЁё]/g) || []).length >= 8) score += 10;
  if (insights && isOfftopicAngle(angle, insights)) score -= 24;
  else if (insights) {
    const theme = preferredTheme(insights);
    if (theme && bagsIn(`${hook} ${angle.caption}`).includes(theme)) score += 8;
  }
  const note = notes.find((n) => n.videoId === angle.id);
  if (note && (note.product || note.process || note.onScreenText.length)) {
    score += 12;
  }
  return score;
}

export function rankCaptionAngles(
  angles: CaptionAngle[],
  notes: VisualNote[] = [],
  insights?: ProfileInsights,
) {
  return [...(angles || [])].sort(
    (a, b) =>
      scoreCaptionAngle(b, notes, insights) - scoreCaptionAngle(a, notes, insights),
  );
}

function hasRussianLine(text: string) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length >= 8 && !isNonRussianCopy(t);
}

export function hasScriptSignal(insights: ProfileInsights) {
  if ((insights.captionAngles || []).some((a) => hasRussianLine(a.hookLine))) {
    return true;
  }
  return (insights.visualNotes || []).some((n) =>
    [n.product, n.process, ...(n.onScreenText || [])].some(hasRussianLine),
  );
}

function tidyBioNiche(bio: string) {
  let t = (bio || "").replace(/\s+/g, " ").trim();
  if (!t || isNonRussianCopy(t) || t.length < 20) return "";
  t = t.replace(/^привет[,!.]?\s*(я\s+)?[^\s.]{2,40}[.!]?\s*/i, "");
  t = t.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim();
  if (t.length < 20) return "";
  return sliceChars(t, 90);
}

export function nicheFromInsights(insights: ProfileInsights) {
  const bio = tidyBioNiche(insights.bioExcerpt || "");
  if (bio) return bio;
  const ranked = rankCaptionAngles(
    insights.captionAngles || [],
    insights.visualNotes || [],
    insights,
  );
  const best = ranked.find((angle) => {
    const line = (angle.hookLine || "").trim();
    if (line.length < 12) return false;
    if (isWeakAngle(line) || isNonRussianCopy(line)) return false;
    if (isOfftopicAngle(angle, insights)) return false;
    return true;
  });
  if (best?.hookLine) return sliceChars(best.hookLine.replace(/[!.?…🔥💔💚]+$/g, "").trim(), 80);
  return "Контент автора";
}

export function isBrokenNiche(niche: string | null | undefined) {
  const t = (niche || "").trim();
  if (!t) return true;
  if (isNonRussianCopy(t)) return true;
  if (/короткий контент|^контент автора$/i.test(t)) return true;
  const semi = t
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (semi.length >= 2) return true;
  if (isWeakAngle(t) || isTruncatedAngle(t) || t.length < 12) return true;
  const commaParts = t
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return commaParts.length >= 2 && commaParts[0].length < 12;
}

export function hookLine(caption: string) {
  const sentences = caption
    .split(/\n+|(?<=[.!?…💔🔥💚💕😅])\s+/)
    .map((l) => stripDecor(l).replace(/[«»]/g, "").trim())
    .filter((l) => l.length >= 8);

  const scored = sentences.map((s) => {
    let score = 0;
    if (PRODUCT_HINT.test(s)) score += 4;
    if (/[«"][^»"]{3,40}[»"]/.test(s) || /[А-ЯЁ][а-яё]+-[а-яё]+/.test(s)) {
      score += 2;
    }
    if (REACTION_ONLY.test(s)) score -= 5;
    if (/^(подробн|технологическ|тк с |обучение можно|купить)/i.test(s)) {
      score -= 3;
    }
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored.find((x) => x.score > 0) || scored[0];
  const line = best?.s || stripDecor(caption).replace(/[«»]/g, "").trim();
  const stop = line.search(/[.!?…]|💔|🔥|💚/);
  const sentence = stop >= 12 ? line.slice(0, stop + 1) : line;
  return tidyHook(sliceWords(sentence.trim(), 72));
}

function tidyHook(text: string) {
  return text
    .replace(/^[-–—•]\s*/, "")
    .replace(/[.,!?…]+$/g, "")
    .replace(/,?\s*одно из моих\w*$/i, "")
    .replace(/,?\s*и бонусом.*$/i, "")
    .replace(/\s+(од|с|и|в|на|из|до|от|по|для|без|при)$/i, "")
    .trim();
}

function extractHashtagProducts(captions: string[]) {
  const counts = new Map<string, number>();
  for (const caption of captions) {
    const tags = caption.match(/#[A-Za-zА-Яа-яЁё0-9_]+/g) || [];
    for (const tag of tags) {
      const clean = tag.replace(/^#/, "").toLowerCase();
      if (clean.length < 5 || GENERIC_TAGS.has(clean)) continue;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => `#${tag}`);
}

function extractQuoted(captions: string[]) {
  const found: string[] = [];
  for (const caption of captions) {
    const matches = caption.match(/[«"]([^»"]{4,60})[»"]/g) || [];
    for (const m of matches) {
      const inner = m.replace(/[«»"]/g, "").trim();
      if (inner && !found.includes(inner)) found.push(inner);
    }
  }
  return found.slice(0, 6);
}

function extractPrices(texts: string[]) {
  const found: string[] = [];
  for (const text of texts) {
    const matches = text.match(priceRe()) || [];
    for (const m of matches) {
      const n = m.replace(/\s+/g, " ").trim();
      if (!found.some((x) => x.replace(/\s/g, "") === n.replace(/\s/g, ""))) {
        found.push(n);
      }
    }
  }
  return found.slice(0, 6);
}

function detectWebsite(text: string) {
  return /(сайт|шапк[аеуи]|ссылк|http|www\.|\.ru\b|\.com\b|купить обучение)/i.test(
    text,
  );
}

function detectTelegram(text: string) {
  return /(t\.me\/|telegram|телеграм)/i.test(text);
}

function suggestKeyword(captions: string[], bio: string) {
  const blob = `${bio}\n${captions.join("\n")}`.toLowerCase();
  if (/рецепт/.test(blob)) return "РЕЦЕПТ";
  if (/(^|[^а-яa-z0-9])тк([^а-яa-z0-9]|$)|технологическ/.test(blob)) return "ТК";
  if (/урок|обучен/.test(blob)) return "УРОК";
  if (/гайд|чеклист|чек-лист/.test(blob)) return "ГАЙД";
  return "ГАЙД";
}

function voiceSamples(captions: string[]) {
  return captions
    .map((c) => sliceChars(stripDecor(c), 160))
    .filter((s) => s.length >= 20)
    .slice(0, 4);
}

function videoAngles(videos: ScrapedVideo[]): CaptionAngle[] {
  return videos
    .filter((v) => (v.caption || "").trim().length >= 8)
    .slice(0, 16)
    .map((v) => ({
      id: v.id,
      views: v.views || 0,
      hookLine: hookLine(v.caption || ""),
      caption: sliceChars(v.caption || "", 400),
    }));
}

/** TikTok top-view rows are often emoji-only; usable copy lives in the caption pool. */
function poolCaptionAngles(captions: string[]): CaptionAngle[] {
  const out: CaptionAngle[] = [];
  for (const [index, raw] of captions.entries()) {
    const caption = (raw || "").replace(/\s+/g, " ").trim();
    if (caption.length < 12) continue;
    const line = hookLine(caption);
    if (!line || isWeakAngle(line) || isNonRussianCopy(line)) continue;
    out.push({
      id: `caption-pool-${index}`,
      views: 0,
      hookLine: line,
      caption: sliceChars(caption, 400),
    });
    if (out.length >= 12) break;
  }
  return out;
}

const KNOWN_TERMS = [
  "зефир",
  "птичье молоко",
  "птичьего молока",
  "шоколад",
  "миндаль",
  "клубника",
  "сливки",
  "тархун",
  "маршмеллоу",
  "трюфель",
  "карамель",
  "агар",
  "пектин",
  "желатин",
  "масло",
  "белок",
  "йогурт",
  "бисквит",
  "фисташка",
  "малина",
  "мята",
  "мятный",
  "какао",
  "сахар",
  "бенто",
  "плитка",
  "бельгийск",
];

function extractWithoutClaims(text: string) {
  const found: string[] = [];
  const re = /без\s+[а-яё]+(?:\s+[а-яё]+){0,2}/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const phrase = match[0].replace(/\s+/g, " ").trim().toLowerCase();
    if (/связ|обратн|регистр/.test(phrase)) continue;
    if (!found.includes(phrase)) found.push(phrase);
  }
  return found.slice(0, 8);
}

function extractAllowedTerms(blob: string) {
  const lower = blob.toLowerCase();
  return KNOWN_TERMS.filter((term) => lower.includes(term));
}

export function buildFactCard(bio: string, captions: string[]): FactCard {
  const blob = `${bio}\n${captions.join("\n")}`.toLowerCase();
  return {
    allowed: uniqueKeepOrder([
      ...extractAllowedTerms(blob),
      ...extractQuoted(captions).map((q) => q.toLowerCase()),
    ]),
    withoutClaims: extractWithoutClaims(blob),
    blob,
  };
}

export function buildProfileInsights(profile: ScrapedProfile): ProfileInsights {
  const captions = allCaptions(profile);
  const bio = profile.bio || "";
  const blob = `${bio}\n${captions.join("\n")}`;
  const products = [
    ...extractQuoted(captions),
    ...videoAngles(profile.topVideos || []).map((a) => a.hookLine),
    ...extractHashtagProducts(captions),
  ]
    .filter(Boolean)
    .slice(0, 12);

  return {
    products: uniqueKeepOrder(products).slice(0, 10),
    prices: extractPrices([bio, ...captions]),
    hasWebsiteCta: detectWebsite(blob),
    hasTelegramCta: detectTelegram(blob),
    voiceSamples: voiceSamples(captions),
    captionAngles: uniqueAngles([
      ...videoAngles(profile.topVideos || []),
      ...poolCaptionAngles(captions),
    ]),
    suggestedKeyword: normalizeKeyword(suggestKeyword(captions, bio), "ГАЙД"),
    bioExcerpt: sliceChars(bio.replace(/\s+/g, " ").trim(), 220),
    avgCaptionChars:
      captions.length === 0
        ? 0
        : Math.round(
            captions.reduce((sum, c) => sum + c.length, 0) / captions.length,
          ),
    factCard: buildFactCard(bio, captions),
    visualNotes: [],
  };
}

const GENERIC_OCR =
  /подпис|лайк|save|follow|reels|ссылк|шапк|обучен|купить на сайте/i;

/**
 * Fold ffmpeg+vision OCR into the fact card and caption angles so silent
 * process accounts still get on-screen product names.
 */
export function mergeVisualNotes(
  insights: ProfileInsights,
  notes: VisualNote[],
): ProfileInsights {
  const usable = (notes || [])
    .map(scrubVisualNote)
    .filter(
      (n) =>
        n &&
        (n.product.trim() ||
          n.process.trim() ||
          n.onScreenText.some((t) => t.trim().length >= 3)),
    );
  if (!usable.length) {
    return { ...insights, visualNotes: [] };
  }

  const extraAllowed = usable
    .flatMap((n) => [n.product, ...n.onScreenText])
    .map((s) => s.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(
      (s) =>
        s.length >= 4 &&
        s.length <= 48 &&
        !GENERIC_OCR.test(s) &&
        !isNonRussianCopy(s),
    );

  const blobExtra = usable
    .map((n) =>
      [n.product, n.process, ...n.onScreenText].filter(Boolean).join(" "),
    )
    .join("\n")
    .toLowerCase();

  const visualAngles: CaptionAngle[] = [];
  for (const note of usable) {
    const caption = [note.product, note.process, ...note.onScreenText]
      .filter((s) => s && s.trim().length >= 4)
      .join(". ");
    if (caption.length < 12) continue;
    const line = hookLine(caption);
    if (!line || isWeakAngle(line) || isNonRussianCopy(line)) continue;
    visualAngles.push({
      id: note.videoId,
      views: 0,
      hookLine: line,
      caption: sliceChars(caption, 400),
    });
  }

  return {
    ...insights,
    visualNotes: usable,
    captionAngles: uniqueAngles([...insights.captionAngles, ...visualAngles]),
    products: uniqueKeepOrder([
      ...insights.products,
      ...usable.map((n) => n.product).filter((s) => s.length >= 4),
    ]).slice(0, 12),
    factCard: {
      allowed: uniqueKeepOrder([
        ...insights.factCard.allowed,
        ...extraAllowed,
      ]),
      withoutClaims: insights.factCard.withoutClaims,
      blob: `${insights.factCard.blob}\n${blobExtra}`.trim(),
    },
  };
}

function scrubVisualNote(note: VisualNote): VisualNote {
  return {
    ...note,
    onScreenText: (note.onScreenText || []).filter(
      (t) => t.trim().length >= 3 && !isNonRussianCopy(t),
    ),
    product: isNonRussianCopy(note.product) ? "" : note.product,
    process: isNonRussianCopy(note.process) ? "" : note.process,
    shotIdeas: (note.shotIdeas || []).filter(
      (t) => t.trim().length >= 4 && !isNonRussianCopy(t),
    ),
  };
}

function betterHook(current: string, candidate: string) {
  const curWeak =
    isWeakAngle(current) ||
    isNonRussianCopy(current) ||
    isTruncatedAngle(current);
  const candWeak =
    isWeakAngle(candidate) ||
    isNonRussianCopy(candidate) ||
    isTruncatedAngle(candidate);
  if (curWeak && !candWeak) return true;
  if (!curWeak && candWeak) return false;
  if (isNonRussianCopy(current) && !isNonRussianCopy(candidate)) return true;
  return false;
}

function uniqueAngles(items: CaptionAngle[]) {
  const byId = new Map<string, CaptionAngle>();
  const out: CaptionAngle[] = [];
  for (const item of items) {
    if (item.id && byId.has(item.id)) {
      const prev = byId.get(item.id)!;
      if (betterHook(prev.hookLine, item.hookLine)) {
        const next = {
          ...prev,
          hookLine: item.hookLine,
          caption: item.caption || prev.caption,
          views: Math.max(prev.views || 0, item.views || 0),
        };
        byId.set(item.id, next);
        const idx = out.findIndex((x) => x.id === item.id);
        if (idx >= 0) out[idx] = next;
      }
      continue;
    }
    const hook = (item.hookLine || "").toLowerCase();
    if (hook && out.some((x) => x.hookLine.toLowerCase() === hook)) continue;
    if (item.id) byId.set(item.id, item);
    out.push(item);
  }
  return out;
}

function uniqueKeepOrder(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

