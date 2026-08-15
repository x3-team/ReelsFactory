import type { Platform } from "@/lib/platform";
import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";

export const MIN_SUBMITTED_REELS = 3;

export type SubmittedReel = {
  url: string;
  caption?: string;
  views?: number;
  likes?: number;
  retentionPct?: number;
};

const REEL_URL_RE =
  /https?:\/\/(?:www\.)?(?:instagram\.com\/(?:reel|p|tv)\/[A-Za-z0-9_-]+\/?|tiktok\.com\/@[^/\s]+\/video\/\d+\/?|vm\.tiktok\.com\/[A-Za-z0-9]+\/?|youtube\.com\/(?:shorts\/[A-Za-z0-9_-]+|watch\?v=[A-Za-z0-9_-]+|embed\/[A-Za-z0-9_-]+|live\/[A-Za-z0-9_-]+)|youtu\.be\/[A-Za-z0-9_-]+)/gi;

const YOUTUBE_CHANNEL_RE =
  /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/|playlist\?)/i;

export function isYoutubeVideoUrl(url: string) {
  const value = (url || "").trim();
  if (!value) return false;
  REEL_URL_RE.lastIndex = 0;
  if (!REEL_URL_RE.test(value)) return false;
  return /youtube\.com\/(?:shorts\/|watch\?v=|embed\/|live\/)|youtu\.be\//i.test(
    value,
  );
}

export function isYoutubeChannelUrl(url: string) {
  return YOUTUBE_CHANNEL_RE.test((url || "").trim());
}

export function parseRetentionHint(text: string): number | undefined {
  const compact = text.replace(/\u00a0/g, " ");
  const after = compact.match(
    /(\d+(?:[.,]\d+)?)\s*%\s*(удерж[а-яё]*|досмотр[а-яё]*|retention)/i,
  );
  if (after) {
    const n = Number(after[1].replace(",", "."));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : undefined;
  }
  const before = compact.match(
    /(удерж[а-яё]*|досмотр[а-яё]*|retention)\s*[:\s]*(\d+(?:[.,]\d+)?)\s*%?/i,
  );
  if (before) {
    const n = Number(before[2].replace(",", "."));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : undefined;
  }
  return undefined;
}

export function parseViewsHint(text: string): number | undefined {
  const compact = text.replace(/\u00a0/g, " ");
  const thousands = compact.match(/(\d+(?:[.,]\d+)?)\s*(тыс\.?|k)(?=$|[\s,.;])/i);
  if (thousands) {
    return Math.round(Number(thousands[1].replace(",", ".")) * 1000);
  }
  const plain = compact.match(/(\d[\d\s]{0,10})\s*(просмотр|охват|views|likes|лайк)/i);
  if (plain) {
    const n = Number(plain[1].replace(/\s/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function parseSubmittedReels(raw: string | null | undefined): SubmittedReel[] {
  const text = (raw || "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const found: SubmittedReel[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (isYoutubeChannelUrl(line)) continue;
    REEL_URL_RE.lastIndex = 0;
    const matches = line.match(REEL_URL_RE) || [];
    for (const url of matches) {
      const normalized = url.replace(/[),.;]+$/, "").replace(/\/$/, "");
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const rest = line.replace(url, " ").replace(/^[\s/]+/, "").replace(/\s+/g, " ").trim();
      const views = parseViewsHint(rest);
      const retentionPct = parseRetentionHint(rest);
      const caption = rest
        .replace(/(\d+(?:[.,]\d+)?)\s*(тыс\.?|k)(?=$|[\s,.;])/gi, " ")
        .replace(
          /(\d[\d\s]{0,10})\s*(просмотр[а-яё]*|охват[а-яё]*|views?|likes?|лайк[а-яё]*)/gi,
          " ",
        )
        .replace(
          /(\d+(?:[.,]\d+)?)\s*%\s*(удерж[а-яё]*|досмотр[а-яё]*|retention)/gi,
          " ",
        )
        .replace(
          /(удерж[а-яё]*|досмотр[а-яё]*|retention)\s*[:\s]*(\d+(?:[.,]\d+)?)\s*%?/gi,
          " ",
        )
        .replace(/(просмотр[а-яё]*|охват[а-яё]*|views?|likes?)/gi, " ")
        .replace(/[|—–-]+/g, " ")
        .replace(/[,\s]+/g, " ")
        .trim();
      found.push({
        url: normalized,
        caption: caption || undefined,
        views,
        retentionPct,
      });
    }
  }

  return found.slice(0, 8);
}

export function readSubmittedReels(raw: unknown): SubmittedReel[] {
  if (typeof raw === "string") return parseSubmittedReels(raw);
  if (!Array.isArray(raw)) return [];
  const out: SubmittedReel[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as SubmittedReel;
    if (typeof row.url !== "string" || !row.url.startsWith("http")) continue;
    out.push({
      url: row.url,
      caption: typeof row.caption === "string" ? row.caption : undefined,
      views: typeof row.views === "number" ? row.views : undefined,
      likes: typeof row.likes === "number" ? row.likes : undefined,
      retentionPct:
        typeof row.retentionPct === "number" ? row.retentionPct : undefined,
    });
  }
  return out.slice(0, 8);
}

export function hasEnoughSubmittedReels(raw: unknown) {
  return readSubmittedReels(raw).length >= MIN_SUBMITTED_REELS;
}

/** At least two lines carry a caption or Insights number — otherwise no script signal. */
export function hasSubmittedReelSignal(raw: unknown) {
  const reels = readSubmittedReels(raw);
  const withSignal = reels.filter(
    (reel) =>
      (reel.caption && reel.caption.replace(/\s+/g, " ").trim().length >= 8) ||
      Boolean(reel.views) ||
      Boolean(reel.retentionPct),
  );
  return reels.length >= MIN_SUBMITTED_REELS && withSignal.length >= 2;
}

export function formatSubmittedReelsText(raw: unknown): string {
  return readSubmittedReels(raw)
    .map((reel) => {
      const bits = [reel.url];
      if (reel.caption) bits.push(reel.caption);
      if (reel.views) bits.push(`${reel.views} просмотров`);
      if (reel.retentionPct) bits.push(`${reel.retentionPct}% удержание`);
      return bits.join("  ");
    })
    .join("\n");
}

export function profileFromSubmittedReels(input: {
  handle: string;
  platform: Platform;
  reels: SubmittedReel[];
  bio?: string | null;
}): ScrapedProfile {
  const topVideos: ScrapedVideo[] = input.reels.map((reel, index) => ({
    id: `user-${index + 1}`,
    url: reel.url,
    caption: reel.caption || "",
    views: reel.views || 0,
    likes: reel.likes,
    retentionPct: reel.retentionPct,
  }));

  return {
    handle: input.handle,
    platform: input.platform,
    bio: (input.bio || "").trim(),
    followers: 0,
    topVideos,
    recentCaptions: topVideos.map((v) => v.caption || "").filter((c) => c.length >= 12),
    source: "user",
  };
}
