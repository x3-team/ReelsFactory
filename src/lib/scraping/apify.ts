import {
  CAPTION_VIDEOS_LIMIT,
  SCRAPE_POSTS_LIMIT,
} from "@/lib/content/scrape-limits";
import {
  apifyInputMentionsHandle,
  handleFromApifyInput,
  shouldAttemptApifyReuse,
} from "@/lib/scraping/apify-reuse";
import {
  mapTikTokActorItems,
  type TikTokActorItem,
} from "@/lib/scraping/tiktok-media";
import type { ScrapedProfile, ScrapedVideo } from "@/lib/types";

const DEFAULT_IG_PROFILE_ACTOR = "apify/instagram-profile-scraper";
const DEFAULT_TT_PROFILE_ACTOR = "clockworks/tiktok-profile-scraper";

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

type ApifyTtItem = TikTokActorItem;

function apifyToken() {
  return process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || "";
}

export function hasApifyCredentials() {
  return Boolean(apifyToken());
}

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

/** apify/instagram-profile-scraper → apify~instagram-profile-scraper */
function actorPath(id: string) {
  return id.replace("/", "~");
}

async function apifyGet<T>(path: string): Promise<T> {
  const token = apifyToken();
  const res = await fetch(`https://api.apify.com/v2/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify GET ${path} failed (${res.status}): ${body.slice(0, 180)}`);
  }
  return (await res.json()) as T;
}

async function reuseSucceededDataset<T>(
  actor: string,
  input: unknown,
): Promise<T[] | null> {
  const handle = handleFromApifyInput(input);
  if (!handle) return null;
  type RunRow = {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
    defaultKeyValueStoreId?: string;
  };
  const listed = await apifyGet<{ data?: { items?: RunRow[] } }>(
    `acts/${actorPath(actor)}/runs?limit=30&desc=1&status=SUCCEEDED`,
  );
  for (const run of listed.data?.items || []) {
    if (!run.defaultDatasetId || !run.defaultKeyValueStoreId) continue;
    let runInput: unknown = null;
    try {
      runInput = await apifyGet(
        `key-value-stores/${run.defaultKeyValueStoreId}/records/INPUT`,
      );
    } catch {
      continue;
    }
    if (!apifyInputMentionsHandle(runInput, handle)) continue;
    const items = await apifyGet<T[]>(`datasets/${run.defaultDatasetId}/items`);
    if (Array.isArray(items) && items.length > 0) {
      console.info(
        `Apify ${actor}: reuse SUCCEEDED dataset for @${handle} (new run blocked)`,
      );
      return items;
    }
  }
  return null;
}

async function runApifyActor<T>(
  actor: string,
  input: unknown,
  timeoutSecs?: number,
): Promise<{ items: T[]; reused: boolean }> {
  const token = apifyToken();
  if (!token) {
    throw new Error("APIFY_TOKEN не задан");
  }

  if (process.env.APIFY_REUSE_ONLY === "true") {
    const reused = await reuseSucceededDataset<T>(actor, input);
    if (reused?.length) return { items: reused, reused: true };
    throw new Error("APIFY_REUSE_ONLY: нет SUCCEEDED датасета для этого хендла");
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
    const status = Number(res.status);
    if (shouldAttemptApifyReuse(status, body)) {
      try {
        const reused = await reuseSucceededDataset<T>(actor, input);
        if (reused?.length) return { items: reused, reused: true };
      } catch (error) {
        console.warn(
          "Apify dataset reuse failed",
          error instanceof Error ? error.message : error,
        );
      }
      throw new Error(
        `Достигнут месячный лимит Apify (${status}). Новый run заблокирован, reuse не нашёл датасет.`,
      );
    }
    throw new Error(`Apify ${actor} failed (${status}): ${body.slice(0, 300)}`);
  }

  const items = (await res.json()) as T[];
  if (!Array.isArray(items)) {
    throw new Error(`Apify ${actor}: неожиданный ответ`);
  }
  return { items, reused: false };
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

/**
 * Instagram profile + latest posts/reels via Apify.
 * Prefers official actor `apify/instagram-profile-scraper` (override with APIFY_INSTAGRAM_ACTOR).
 * On monthly 403, reuses the last SUCCEEDED dataset for the same handle.
 */
export async function fetchInstagramViaApify(
  handle: string,
): Promise<ScrapedProfile> {
  const { items, reused } = await runApifyActor<ApifyIgProfile>(igActorId(), {
    usernames: [handle],
    resultsLimit: SCRAPE_POSTS_LIMIT,
  });
  if (items.length === 0) {
    throw new Error(`Apify: пустой ответ для @${handle}`);
  }

  const profile = items[0];
  if (profile.error || profile.errorDescription) {
    throw new Error(
      `Apify: ${profile.error || profile.errorDescription || "ошибка профиля"}`,
    );
  }

  const topVideos = mapPosts(profile.latestPosts || []);
  const scrapeMode = reused ? "apify-reuse" : "live-run";

  return {
    handle: profile.username || handle,
    platform: "instagram",
    displayName: profile.fullName,
    bio: profile.biography || "",
    followers: profile.followersCount || 0,
    following: profile.followsCount,
    postsCount: profile.postsCount,
    topVideos,
    scrapeMode,
  };
}

/**
 * TikTok profile + latest videos via Apify.
 * Default actor `clockworks/tiktok-profile-scraper` (override with APIFY_TIKTOK_ACTOR).
 * Whisper URL берём из musicMeta.playUrl / mediaUrls / downloadAddr — не из videoUrl
 * (при shouldDownloadVideos=false videoUrl пустой, см. tiktok-media.ts).
 */
export async function fetchTikTokViaApify(handle: string): Promise<ScrapedProfile> {
  const { items, reused } = await runApifyActor<ApifyTtItem>(ttActorId(), {
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
  const topVideos = mapTikTokActorItems(items, handle);

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
    scrapeMode: reused ? "apify-reuse" : "live-run",
  };
}
