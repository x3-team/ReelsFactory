import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";

const DEFAULT_IG_PROFILE_ACTOR = "apify/instagram-profile-scraper";

type ApifyIgPost = {
  id?: string;
  shortCode?: string;
  url?: string;
  caption?: string;
  type?: string;
  productType?: string;
  videoUrl?: string;
  videoViewCount?: number;
  likesCount?: number;
  videoDuration?: number;
  timestamp?: string;
};

type ApifyIgProfile = {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  latestPosts?: ApifyIgPost[];
  error?: string;
  errorDescription?: string;
};

function apifyToken() {
  return process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || "";
}

export function hasApifyCredentials() {
  return Boolean(apifyToken());
}

function actorId() {
  return (
    process.env.APIFY_INSTAGRAM_ACTOR ||
    process.env.APIFY_IG_ACTOR ||
    DEFAULT_IG_PROFILE_ACTOR
  );
}

/** apify/instagram-profile-scraper → apify~instagram-profile-scraper */
function actorPath(id: string) {
  return id.replace("/", "~");
}

function isVideoPost(post: ApifyIgPost) {
  if (post.videoUrl) return true;
  if (post.type === "Video") return true;
  if (post.productType === "clips" || post.productType === "reels") return true;
  return false;
}

function mapPosts(posts: ApifyIgPost[]): ScrapedVideo[] {
  return posts
    .filter(isVideoPost)
    .map((post, index) => {
      const code = post.shortCode || post.id || `ig-${index}`;
      return {
        id: String(post.id || code),
        url: post.url || `https://www.instagram.com/reel/${code}/`,
        caption: post.caption || "",
        views: post.videoViewCount || 0,
        likes: post.likesCount,
        audioUrl: post.videoUrl,
        durationSec: post.videoDuration,
      } satisfies ScrapedVideo;
    })
    .sort((a, b) => b.views - a.views)
    // Больше кандидатов → LLM видит шире паттерны, даже если сценариев всё равно 3
    .slice(0, 10);
}

async function runApifyOnce(handle: string, resultsLimit: number) {
  const token = apifyToken();
  if (!token) {
    throw new Error("APIFY_TOKEN не задан");
  }

  const path = actorPath(actorId());
  const url = new URL(
    `https://api.apify.com/v2/acts/${path}/run-sync-get-dataset-items`,
  );
  url.searchParams.set("token", token);
  url.searchParams.set("timeout", process.env.APIFY_TIMEOUT_SECS || "70");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernames: [handle],
      resultsLimit,
    }),
    signal: AbortSignal.timeout(
      Number(process.env.APIFY_FETCH_TIMEOUT_MS || 75_000),
    ),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Apify Instagram scraper failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }

  const items = (await res.json()) as ApifyIgProfile[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`Apify: пустой ответ для @${handle}`);
  }

  const profile = items[0];
  if (profile.error || profile.errorDescription) {
    throw new Error(
      `Apify: ${profile.error || profile.errorDescription || "ошибка профиля"}`,
    );
  }
  return profile;
}

/**
 * Instagram profile + latest posts/reels via Apify.
 * Prefers official actor `apify/instagram-profile-scraper` (override with APIFY_INSTAGRAM_ACTOR).
 */
export async function fetchInstagramViaApify(
  handle: string,
): Promise<ScrapedProfile> {
  const primaryLimit = Number(process.env.APIFY_RESULTS_LIMIT || 24);
  let profile = await runApifyOnce(handle, primaryLimit);
  let topVideos = mapPosts(profile.latestPosts || []);

  // Мало рилсов в окне — пробуем шире (до 48), чтобы не строить разбор «на пустом»
  if (topVideos.length < 3 && primaryLimit < 48) {
    try {
      profile = await runApifyOnce(handle, 48);
      topVideos = mapPosts(profile.latestPosts || []);
    } catch (error) {
      console.warn("Apify wider scrape failed, keeping first pass", error);
    }
  }

  if (topVideos.length === 0) {
    console.warn(
      `Apify @${handle}: в последних постах нет видео/reels — стратегия пойдёт в основном с bio`,
    );
  } else if (topVideos.length < 3) {
    console.warn(
      `Apify @${handle}: мало reels (${topVideos.length}) в окне latestPosts — качество разбора может просесть`,
    );
  }

  return {
    handle: profile.username || handle,
    platform: "instagram",
    displayName: profile.fullName,
    bio: profile.biography || "",
    followers: profile.followersCount || 0,
    following: profile.followsCount,
    postsCount: profile.postsCount,
    topVideos,
  };
}
