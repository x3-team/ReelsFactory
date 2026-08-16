import { CAPTION_VIDEOS_LIMIT } from "@/lib/content/scrape-limits";
import type { ScrapedVideo } from "@/lib/types";

/**
 * Сырой элемент clockworks/tiktok-profile-scraper (и близкие формы).
 * Актор кладёт качаемое медиа не в videoUrl, а в musicMeta / videoMeta / mediaUrls.
 */
export type TikTokActorItem = {
  id?: string;
  text?: string;
  webVideoUrl?: string;
  playCount?: number;
  diggCount?: number;
  videoUrl?: string;
  mediaUrls?: unknown;
  downloadAddr?: string;
  videoMeta?: {
    duration?: number;
    downloadAddr?: string;
    originalDownloadAddr?: string;
    playUrl?: string;
  };
  musicMeta?: { playUrl?: string };
  music?: { playUrl?: string };
  video?: {
    playUrl?: string;
    downloadUrl?: string;
    downloadAddr?: string;
  };
  authorMeta?: {
    name?: string;
    nickName?: string;
    signature?: string;
    fans?: number;
    following?: number;
    video?: number;
  };
  author?: {
    uniqueId?: string;
    nickname?: string;
    signature?: string;
  };
  stats?: { playCount?: number; diggCount?: number };
};

/** HTML-страница ролика / шортлинк — Whisper её не скачает. CDN (v16-*.tiktok.com) оставляем. */
export function isTikTokWatchPage(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "tiktok.com" ||
      host === "www.tiktok.com" ||
      host === "m.tiktok.com" ||
      host === "vm.tiktok.com" ||
      host === "vt.tiktok.com"
    );
  } catch {
    return false;
  }
}

export function isHttpMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return false;
  if (isTikTokWatchPage(url)) return false;
  return true;
}

function firstMediaUrl(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (isHttpMediaUrl(item)) return item.trim();
      }
      continue;
    }
    if (isHttpMediaUrl(candidate)) return candidate.trim();
  }
  return undefined;
}

/**
 * Что реально отдаёт clockworks при shouldDownloadVideos=false
 * (прогон @eugenius_official 16.08.2026):
 * - videoUrl / mediaUrls / videoMeta.downloadAddr — пустые
 * - musicMeta.playUrl — audio/mpeg (ID3), качается
 * При shouldDownloadVideos=true появляются videoUrl и mediaUrls на сторадже Apify.
 */
export function pickTikTokMediaUrls(item: TikTokActorItem): {
  audioUrl?: string;
  videoUrl?: string;
} {
  const audioUrl = firstMediaUrl(item.musicMeta?.playUrl, item.music?.playUrl);
  const videoUrl = firstMediaUrl(
    item.videoUrl,
    item.mediaUrls,
    item.videoMeta?.downloadAddr,
    item.videoMeta?.originalDownloadAddr,
    item.videoMeta?.playUrl,
    item.video?.downloadUrl,
    item.video?.downloadAddr,
    item.video?.playUrl,
    item.downloadAddr,
  );
  return { audioUrl, videoUrl };
}

export function tiktokWhisperUrl(item: TikTokActorItem | ScrapedVideo) {
  if ("musicMeta" in item || "videoMeta" in item || "mediaUrls" in item) {
    const picked = pickTikTokMediaUrls(item);
    return picked.audioUrl || picked.videoUrl;
  }
  const video = item as ScrapedVideo;
  return firstMediaUrl(video.audioUrl, video.videoUrl);
}

export function mapTikTokActorItems(
  items: TikTokActorItem[],
  handle: string,
): ScrapedVideo[] {
  return items
    .map((item, index) => {
      const views = item.playCount || item.stats?.playCount || 0;
      const media = pickTikTokMediaUrls(item);
      return {
        id: String(item.id || `tt-${index}`),
        url:
          item.webVideoUrl ||
          `https://www.tiktok.com/@${handle}/video/${item.id || index}`,
        caption: item.text || "",
        views,
        likes: item.diggCount || item.stats?.diggCount,
        audioUrl: media.audioUrl || media.videoUrl,
        videoUrl: media.videoUrl,
        durationSec: item.videoMeta?.duration,
      } satisfies ScrapedVideo;
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, CAPTION_VIDEOS_LIMIT);
}
