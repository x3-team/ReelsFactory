import { isMockMode } from "@/lib/config";
import { canRunApify, recordCostEvent } from "@/lib/cost-meter";
import { mockScrapedProfile } from "@/lib/mocks/demo-data";
import { prisma } from "@/lib/prisma";
import { normalizeHandle, type Platform } from "@/lib/platform";
import {
  fetchInstagramViaApify,
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
  const cacheKey = `${input.platform}:${handle.toLowerCase()}`;

  const cached = await prisma.scrapeCache.findUnique({
    where: { cacheKey },
  });
  if (cached && Date.now() - cached.createdAt.getTime() < scrapeTtlMs()) {
    return cached.profile as unknown as ScrapedProfile;
  }

  if (isMockMode() || !hasScrapingCredentials()) {
    return mockScrapedProfile(handle, input.platform);
  }

  let profile: ScrapedProfile | null = null;

  if (input.platform === "instagram") {
    if (hasApifyCredentials() && (await canRunApify())) {
      try {
        profile = await fetchInstagramViaApify(handle);
        await recordCostEvent("apify", input.userId, handle);
      } catch (error) {
        console.error("Apify Instagram scrape failed, trying RapidAPI", error);
        if (!hasRapidApiCredentials()) throw error;
      }
    } else if (hasApifyCredentials()) {
      console.warn("Apify monthly cap reached — RapidAPI/mock fallback");
    }

    if (!profile && hasRapidApiCredentials()) {
      profile = await fetchInstagramViaRapidApi(handle);
    }
  }

  if (!profile) {
    return mockScrapedProfile(handle, input.platform);
  }

  await prisma.scrapeCache.upsert({
    where: { cacheKey },
    create: { cacheKey, profile: profile as object },
    update: { profile: profile as object, createdAt: new Date() },
  });

  return profile;
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
      .slice(0, 5);
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
