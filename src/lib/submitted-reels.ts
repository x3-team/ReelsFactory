import type { Platform } from "@/lib/platform";
import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";

export const MIN_SUBMITTED_REELS = 2;

export type SubmittedReel = {
  url: string;
  caption?: string;
  views?: number;
  likes?: number;
};

const REEL_URL_RE =
  /https?:\/\/(?:www\.)?(?:instagram\.com\/(?:reel|p|tv)\/[A-Za-z0-9_-]+|tiktok\.com\/@[^/\s]+\/video\/\d+|vm\.tiktok\.com\/[A-Za-z0-9]+)/gi;

export function parseViewsHint(text: string): number | undefined {
  const compact = text.replace(/\u00a0/g, " ");
  const thousands = compact.match(/(\d+(?:[.,]\d+)?)\s*(тыс\.?|k)\b/i);
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
    const matches = line.match(REEL_URL_RE) || [];
    for (const url of matches) {
      const normalized = url.replace(/[),.;]+$/, "").replace(/\/$/, "");
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const rest = line.replace(url, " ").replace(/\s+/g, " ").trim();
      const views = parseViewsHint(rest);
      const caption = rest
        .replace(/(\d+(?:[.,]\d+)?)\s*(тыс\.?|k)\b/gi, " ")
        .replace(/(\d[\d\s]{0,10})\s*(просмотр\w*|охват\w*|views?|likes?|лайк\w*)/gi, " ")
        .replace(/[|—–-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      found.push({
        url: normalized,
        caption: caption || undefined,
        views,
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
    });
  }
  return out.slice(0, 8);
}

export function hasEnoughSubmittedReels(raw: unknown) {
  return readSubmittedReels(raw).length >= MIN_SUBMITTED_REELS;
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
