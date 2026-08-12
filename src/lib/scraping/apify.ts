import {
  CAPTION_VIDEOS_LIMIT,
  SCRAPE_POSTS_LIMIT,
} from "@/lib/content/scrape-limits";
import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";

const DEFAULT_IG_PROFILE_ACTOR = "apify/instagram-profile-scraper";
const DEFAULT_IG_POSTS_ACTOR = "apify/instagram-scraper";

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

const DEFAULT_TT_PROFILE_ACTOR = "clockworks/tiktok-profile-scraper";

function igActorId() {
  return (
    process.env.APIFY_INSTAGRAM_ACTOR ||
    process.env.APIFY_IG_ACTOR ||
    DEFAULT_IG_PROFILE_ACTOR
  );
}

function ttActorId() {
  return process.env.APIFY_TIKTOK_ACTOR || DEFAULT_TT_PROFILE_ACTOR;
}

function igPostsActorId() {
  return process.env.APIFY_INSTAGRAM_POSTS_ACTOR || DEFAULT_IG_POSTS_ACTOR;
}

/** apify/instagram-profile-scraper → apify~instagram-profile-scraper */
function actorPath(id: string) {
  return id.replace("/", "~");
}

async function runApifyActor<T>(
  actor: string,
  input: unknown,
  timeoutSecs?: number,
): Promise<T[]> {
  const token = apifyToken();
  if (!token) {
    throw new Error("APIFY_TOKEN не задан");
  }

  const timeoutNum = Number(timeoutSecs || process.env.APIFY_TIMEOUT_SECS || 120);
  const url = new URL(
    `https://api.apify.com/v2/acts/${actorPath(actor)}/run-sync-get-dataset-items`,
  );
  url.searchParams.set("timeout", String(timeoutNum));

  const fetchMs =
    Number(process.env.APIFY_FETCH_TIMEOUT_MS || 0) || timeoutNum * 1000 + 10_000;
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(fetchMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Apify ${actor} failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }

  const items = (await res.json()) as T[];
  if (!Array.isArray(items)) {
    throw new Error(`Apify ${actor}: неожиданный ответ`);
  }
  return items;
}

function isVideoPost(post: ApifyIgPost) {
  if (post.videoUrl) return true;
  const type = (post.type || "").toLowerCase();
  if (
    type === "video" ||
    type === "graphvideo" ||
    type === "reel" ||
    type === "clips"
  ) {
    return true;
  }
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
    .slice(0, CAPTION_VIDEOS_LIMIT);
}

function collectIgPosts(items: Array<ApifyIgProfile & ApifyIgPost>): ApifyIgPost[] {
  const posts: ApifyIgPost[] = [];
  const seen = new Set<string>();
  const push = (post: ApifyIgPost) => {
    const id = String(post.id || post.shortCode || "");
    if (!id || seen.has(id)) return;
    if (!post.caption && !post.videoUrl && !post.shortCode) return;
    seen.add(id);
    posts.push(post);
  };
  for (const item of items) {
    for (const nested of item.latestPosts || []) push(nested);
    push(item);
  }
  return posts;
}

function collectCaptions(posts: ApifyIgPost[]) {
  return posts
    .map((post) => (post.caption || "").trim())
    .filter((caption) => caption.length >= 12)
    .slice(0, SCRAPE_POSTS_LIMIT);
}

async function fetchMoreIgPosts(
  handle: string,
  userId?: string,
): Promise<ApifyIgPost[]> {
  if (process.env.APIFY_SKIP_POSTS_ACTOR === "true") return [];
  const { canRunApify, recordCostEvent } = await import("@/lib/cost-meter");
  if (!(await canRunApify())) return [];

  const directUrls = [`https://www.instagram.com/${handle}/`];
  const preferred = process.env.APIFY_IG_POSTS_TYPE || "reels";
  const types = [...new Set([preferred, "posts"])];
  const timeoutSecs = Number(process.env.APIFY_POSTS_TIMEOUT_SECS || 90);

  for (const resultsType of types) {
    try {
      const items = await runApifyActor<ApifyIgPost>(
        igPostsActorId(),
        {
          directUrls,
          resultsType,
          resultsLimit: SCRAPE_POSTS_LIMIT,
        },
        timeoutSecs,
      );
      await recordCostEvent("apify", userId, `ig-posts:${resultsType}`);
      const usable = items.filter(
        (item) => item.shortCode || item.id || item.videoUrl || item.caption,
      );
      if (usable.length) return usable;
      return [];
    } catch (error) {
      console.warn(
        `Apify ${igPostsActorId()} ${resultsType} failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return [];
}

/**
 * Instagram profile + latest posts/reels via Apify.
 * Profile actor first; if it returns too few videos, a second actor
 * (`apify/instagram-scraper`, override APIFY_INSTAGRAM_POSTS_ACTOR) pulls more reels.
 */
export async function fetchInstagramViaApify(
  handle: string,
  userId?: string,
): Promise<ScrapedProfile> {
  let items: Array<ApifyIgProfile & ApifyIgPost> = [];
  try {
    items = await runApifyActor<ApifyIgProfile & ApifyIgPost>(igActorId(), {
      usernames: [handle],
      resultsLimit: SCRAPE_POSTS_LIMIT,
      resultsType: "details_and_posts",
    });
  } catch {
    items = await runApifyActor<ApifyIgProfile & ApifyIgPost>(igActorId(), {
      usernames: [handle],
      resultsLimit: SCRAPE_POSTS_LIMIT,
    });
  }
  if (items.length === 0) {
    throw new Error(`Apify: пустой ответ для @${handle}`);
  }

  const profile =
    items.find((item) => item.username || item.biography || item.followersCount) ||
    items[0];
  if (profile.error || profile.errorDescription) {
    throw new Error(
      `Apify: ${profile.error || profile.errorDescription || "ошибка профиля"}`,
    );
  }

  const latest = collectIgPosts(items);
  let extra: ApifyIgPost[] = [];
  if (mapPosts(latest).length < CAPTION_VIDEOS_LIMIT) {
    extra = await fetchMoreIgPosts(handle, userId);
  }
  const merged = extra.length ? collectIgPosts([...items, ...extra]) : latest;
  const topVideos = mapPosts(merged);

  return {
    handle: profile.username || handle,
    platform: "instagram",
    displayName: profile.fullName,
    bio: profile.biography || "",
    followers: profile.followersCount || 0,
    following: profile.followsCount,
    postsCount: profile.postsCount,
    topVideos,
    recentCaptions: collectCaptions(merged),
  };
}

type ApifyTtItem = {
  id?: string;
  text?: string;
  webVideoUrl?: string;
  playCount?: number;
  diggCount?: number;
  videoUrl?: string;
  videoMeta?: { duration?: number };
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

/**
 * TikTok profile + latest videos via Apify.
 * Default actor `clockworks/tiktok-profile-scraper` (override with APIFY_TIKTOK_ACTOR).
 */
export async function fetchTikTokViaApify(handle: string): Promise<ScrapedProfile> {
  const items = await runApifyActor<ApifyTtItem>(ttActorId(), {
    profiles: [handle],
    resultsPerPage: SCRAPE_POSTS_LIMIT,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
  });
  if (items.length === 0) {
    throw new Error(`Apify TikTok: пустой ответ для @${handle}`);
  }

  const author = items[0]?.authorMeta || items[0]?.author;
  const topVideos = items
    .map((item, index) => {
      const views = item.playCount || item.stats?.playCount || 0;
      return {
        id: String(item.id || `tt-${index}`),
        url:
          item.webVideoUrl ||
          `https://www.tiktok.com/@${handle}/video/${item.id || index}`,
        caption: item.text || "",
        views,
        likes: item.diggCount || item.stats?.diggCount,
        audioUrl: item.videoUrl,
        durationSec: item.videoMeta?.duration,
      } satisfies ScrapedVideo;
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, CAPTION_VIDEOS_LIMIT);

  const name =
    (author && "name" in author ? author.name : undefined) ||
    (author && "uniqueId" in author ? author.uniqueId : undefined) ||
    handle;
  const displayName =
    (author && "nickName" in author ? author.nickName : undefined) ||
    (author && "nickname" in author ? author.nickname : undefined);
  const bio =
    (author && "signature" in author ? author.signature : undefined) || "";
  const followers =
    (author && "fans" in author ? author.fans : undefined) || 0;
  const following =
    (author && "following" in author ? author.following : undefined);
  const postsCount =
    (author && "video" in author ? author.video : undefined) || items.length;

  return {
    handle: name || handle,
    platform: "tiktok",
    displayName,
    bio,
    followers,
    following,
    postsCount,
    topVideos,
    recentCaptions: items
      .map((item) => (item.text || "").trim())
      .filter((text) => text.length >= 12)
      .slice(0, SCRAPE_POSTS_LIMIT),
  };
}
