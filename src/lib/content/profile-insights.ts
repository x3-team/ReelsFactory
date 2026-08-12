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
  return REACTION_ONLY.test(t) || Array.from(t).length < 18;
}

export function isWeakAngle(text: string) {
  const t = (text || "").trim();
  if (isReactionHook(t)) return true;
  if (/^[-–—•]\s*/.test(t)) return true;
  if (
    /технологическ|обучение можно|купить на сайте|ссылк\w* в шапк/i.test(t)
  ) {
    return true;
  }
  return false;
}

export function hookLine(caption: string) {
  const sentences = caption
    .split(/\n+|(?<=[.!?…💔🔥💚💕😅])\s+/)
    .map((l) => stripDecor(l).replace(/[«»]/g, "").trim())
    .filter((l) => l.length >= 12);

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
  return sliceWords(sentence.trim(), 72);
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
    .filter((v) => (v.caption || "").trim().length >= 12)
    .slice(0, 16)
    .map((v) => ({
      id: v.id,
      views: v.views || 0,
      hookLine: hookLine(v.caption || ""),
      caption: sliceChars(v.caption || "", 400),
    }));
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
    captionAngles: videoAngles(profile.topVideos || []),
    suggestedKeyword: normalizeKeyword(suggestKeyword(captions, bio), "ГАЙД"),
    bioExcerpt: sliceChars(bio.replace(/\s+/g, " ").trim(), 220),
    avgCaptionChars:
      captions.length === 0
        ? 0
        : Math.round(
            captions.reduce((sum, c) => sum + c.length, 0) / captions.length,
          ),
    factCard: buildFactCard(bio, captions),
  };
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

