import { isMockMode } from "@/lib/config";
import { CAPTION_VIDEOS_LIMIT } from "@/lib/content/scrape-limits";
import { mockScrapedProfile } from "@/lib/mocks/demo-data";
import {
  assertSupportedPlatform,
  normalizeHandle,
  YOUTUBE_UNSUPPORTED_MESSAGE,
  type Platform,
} from "@/lib/platform";
import {
  fetchInstagramViaApify,
  fetchTikTokViaApify,
  hasApifyCredentials,
} from "@/lib/scraping/apify";
import { shouldFallbackToRapidApi } from "@/lib/scraping/apify-reuse";
import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";

function hasRapidApiCredentials() {
  return Boolean(process.env.RAPIDAPI_KEY);
}

export function hasScrapingCredentials() {
  return hasApifyCredentials() || hasRapidApiCredentials();
}

export async function parseProfile(input: {
  handle: string;
  platform: Platform;
}): Promise<ScrapedProfile> {
  assertSupportedPlatform(input.platform);
  const handle = normalizeHandle(input.handle, input.platform);

  if (isMockMode() || !hasScrapingCredentials()) {
    return mockScrapedProfile(handle, input.platform);
  }

  if (input.platform === "instagram") {
    // Apify first (videoUrl для Whisper), RapidAPI — fallback
    if (hasApifyCredentials()) {
      try {
        const profile = await fetchInstagramViaApify(handle);
        if (profile.topVideos.length === 0) {
          // Профиль есть, но без видео — не падаем в mock-био
          return profile;
        }
        return profile;
      } catch (error) {
        if (!shouldFallbackToRapidApi(error)) throw error;
        console.error("Apify Instagram scrape failed, trying RapidAPI", error);
        if (!hasRapidApiCredentials()) throw error;
      }
    }

    if (hasRapidApiCredentials()) {
      return fetchInstagramViaRapidApi(handle);
    }
  }

  if (input.platform === "tiktok") {
    if (!hasApifyCredentials()) {
      throw new Error(
        "TikTok без APIFY_TOKEN не разбираем — иначе получится демо-профиль.",
      );
    }
    return fetchTikTokViaApify(handle);
  }

  throw new Error(YOUTUBE_UNSUPPORTED_MESSAGE);
}


async function fetchInstagramViaRapidApi(handle: string): Promise<ScrapedProfile> {
  const host = process.env.RAPIDAPI_HOST || "instagram-scraper-api2.p.rapidapi.com";
  const res = await fetch(
    `https://${host}/v1/info?username_or_id_or_url=${encodeURIComponent(handle)}`,
    {
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
        "x-rapidapi-host": host,
      },
      next: { revalidate: 0 },
    },
  );

  if (!res.ok) {
    throw new Error(`Scraping API failed (${res.status})`);
  }

  const json = (await res.json()) as {
    data?: {
      username?: string;
      full_name?: string;
      biography?: string;
      follower_count?: number;
      following_count?: number;
      media_count?: number;
    };
  };

  const mediaRes = await fetch(
    `https://${host}/v1/posts?username_or_id_or_url=${encodeURIComponent(handle)}`,
    {
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
        "x-rapidapi-host": host,
      },
      next: { revalidate: 0 },
    },
  );

  let topVideos: ScrapedVideo[] = [];
  if (mediaRes.ok) {
    const mediaJson = (await mediaRes.json()) as {
      data?: {
        items?: Array<{
          id?: string;
          code?: string;
          caption?: { text?: string } | string;
          play_count?: number;
          view_count?: number;
          like_count?: number;
          video_url?: string;
          video_duration?: number;
        }>;
      };
    };
    topVideos = (mediaJson.data?.items || [])
      .map((item, index) => {
        const caption =
          typeof item.caption === "string"
            ? item.caption
            : item.caption?.text || "";
        return {
          id: item.id || item.code || `ig-${index}`,
          url: `https://instagram.com/reel/${item.code || item.id || index}`,
          caption,
          views: item.play_count || item.view_count || 0,
          likes: item.like_count,
          audioUrl: item.video_url,
          durationSec: item.video_duration,
        } satisfies ScrapedVideo;
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, CAPTION_VIDEOS_LIMIT);
  }

  return {
    handle: json.data?.username || handle,
    platform: "instagram",
    displayName: json.data?.full_name,
    bio: json.data?.biography || "",
    followers: json.data?.follower_count || 0,
    following: json.data?.following_count,
    postsCount: json.data?.media_count,
    topVideos,
  };
}
