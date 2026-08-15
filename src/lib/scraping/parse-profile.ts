import { canRunApify, recordCostEvent } from "@/lib/cost-meter";
import {
  CAPTION_VIDEOS_LIMIT,
  PROFILE_CACHE_VERSION,
  SCRAPE_POSTS_LIMIT,
} from "@/lib/content/scrape-limits";
import {
  HonestyError,
  SCRAPE_FAILED_MESSAGE,
  TIKTOK_NEEDS_APIFY_MESSAGE,
  YOUTUBE_UNSUPPORTED_MESSAGE,
  allowMockProfile,
  assertCanAnalyzeProfile,
  envForcesAllMock,
  isMockScrapedProfile,
} from "@/lib/honesty";
import { mockScrapedProfile } from "@/lib/mocks/demo-data";
import { prisma } from "@/lib/prisma";
import { normalizeHandle, type Platform } from "@/lib/platform";
import {
  fetchInstagramViaApify,
  fetchTikTokViaApify,
  hasApifyCredentials,
} from "@/lib/scraping/apify";
import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";

function hasRapidApiCredentials() {
  return Boolean(process.env.RAPIDAPI_KEY);
}

export function hasScrapingCredentials() {
  return hasApifyCredentials() || hasRapidApiCredentials();
}

function scrapeTtlMs() {
  return Number(process.env.SCRAPE_CACHE_TTL_HOURS || 24) * 60 * 60 * 1000;
}

export async function parseProfile(input: {
  handle: string;
  platform: Platform;
  userId?: string;
}): Promise<ScrapedProfile> {
  const handle = normalizeHandle(input.handle, input.platform);
  const cacheKey = `${input.platform}:${handle.toLowerCase()}:${PROFILE_CACHE_VERSION}`;

  const cached = await prisma.scrapeCache.findUnique({
    where: { cacheKey },
  });
  if (cached && Date.now() - cached.createdAt.getTime() < scrapeTtlMs()) {
    const cachedProfile = cached.profile as unknown as ScrapedProfile;
    // Never revive a demo row as a live scrape once keys exist.
    if (!isMockScrapedProfile(cachedProfile) || allowMockProfile()) {
      return {
        ...cachedProfile,
        source: isMockScrapedProfile(cachedProfile) ? "mock" : "live",
      };
    }
  }

  assertCanAnalyzeProfile(input.platform);

  if (envForcesAllMock() || !hasScrapingCredentials()) {
    return mockScrapedProfile(handle, input.platform);
  }

  if (input.platform === "youtube") {
    if (allowMockProfile()) return mockScrapedProfile(handle, input.platform);
    throw new HonestyError(YOUTUBE_UNSUPPORTED_MESSAGE, "YOUTUBE", 400);
  }

  if (input.platform === "tiktok" && !hasApifyCredentials()) {
    if (allowMockProfile()) return mockScrapedProfile(handle, input.platform);
    throw new HonestyError(TIKTOK_NEEDS_APIFY_MESSAGE, "TIKTOK", 503);
  }

  let profile: ScrapedProfile | null = null;
  let lastError: unknown = null;

  if (input.platform === "instagram") {
    if (hasApifyCredentials() && (await canRunApify())) {
      try {
        profile = await fetchInstagramViaApify(handle, input.userId);
        await recordCostEvent("apify", input.userId, handle);
      } catch (error) {
        lastError = error;
        console.error("Apify Instagram scrape failed, trying RapidAPI", error);
        if (!hasRapidApiCredentials()) {
          throw error;
        }
      }
    } else if (hasApifyCredentials()) {
      console.warn("Apify monthly cap reached — RapidAPI fallback");
    }

    if (!profile && hasRapidApiCredentials()) {
      try {
        profile = await fetchInstagramViaRapidApi(handle);
      } catch (error) {
        lastError = error;
        console.error("RapidAPI Instagram scrape failed", error);
      }
    }
  }

  if (input.platform === "tiktok") {
    if (hasApifyCredentials() && (await canRunApify())) {
      try {
        profile = await fetchTikTokViaApify(handle);
        await recordCostEvent("apify", input.userId, handle);
      } catch (error) {
        lastError = error;
        console.error("Apify TikTok scrape failed", error);
      }
    } else if (hasApifyCredentials()) {
      lastError = new Error("Достигнут месячный лимит Apify");
      console.warn("Apify monthly cap reached — TikTok scrape refused");
    }
  }

  if (!profile) {
    // Never substitute a demo profile after a live scrape was attempted.
    const detail =
      lastError instanceof Error && lastError.message
        ? lastError.message
        : SCRAPE_FAILED_MESSAGE;
    throw new HonestyError(detail, "SCRAPE_FAILED", 502);
  }

  const liveProfile: ScrapedProfile = { ...profile, source: "live" };

  await prisma.scrapeCache.upsert({
    where: { cacheKey },
    create: { cacheKey, profile: liveProfile as object },
    update: { profile: liveProfile as object, createdAt: new Date() },
  });

  return liveProfile;
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
  let recentCaptions: string[] = [];
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
    const items = mediaJson.data?.items || [];
    topVideos = items
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
    recentCaptions = items
      .map((item) => {
        const caption =
          typeof item.caption === "string"
            ? item.caption
            : item.caption?.text || "";
        return caption.trim();
      })
      .filter((caption) => caption.length >= 12)
      .slice(0, SCRAPE_POSTS_LIMIT);
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
    recentCaptions,
  };
}
