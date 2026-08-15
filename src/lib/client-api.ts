let clientInitData = "";

export function setClientInitData(raw?: string | null) {
  clientInitData = raw?.trim() || "";
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(clientInitData ? { "x-telegram-init-data": clientInitData } : {}),
      ...(init?.headers || {}),
    },
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export type AppUser = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  socialHandle?: string | null;
  platform?: string | null;
  profileGoal?: "GROW_AUDIENCE" | "SELL_PRODUCT" | null;
  toneOfVoice?: "DIRECT" | "HUMOROUS" | "EXPERT" | "STORYTELLING" | null;
  websiteUrl?: string | null;
  offerSummary?: string | null;
  nichePreset?: string | null;
  voiceDraft?: string | null;
  submittedReels?: Array<{
    url: string;
    caption?: string;
    views?: number;
    likes?: number;
    retentionPct?: number;
  }> | null;
  subscriptionPlan: "FREE" | "START" | "PRO" | "AGENCY";
  subscriptionExpiresAt?: string | null;
  referralBalance: number;
  onboardedAt?: string | null;
};

export type AppPlatformPack = {
  reels: { caption: string; cta: string; hashtags?: string[] };
  vk_clips: { caption: string; cta: string };
  shorts: { title: string; description: string; cta: string };
  telegram_post: { text: string; cta: string };
};

export type AppFunnel = {
  comment_keyword: string;
  bot_reply: string;
  lead_magnet: string;
  telegram_cta: string;
};

export type AppScript = {
  id: string;
  title: string;
  format: string;
  hookOptions: string[];
  teleprompterScript: string;
  caption: string;
  cta: string;
  isTeaser: boolean;
  durationSec?: number | null;
  commentKeyword?: string | null;
  platformPacks?: AppPlatformPack | null;
  funnel?: AppFunnel | null;
  propsChecklist?: string[] | null;
  shootOrder?: number | null;
  sourceType?: string | null;
  sourceAngle?: string | null;
  shotList?: string[] | null;
};

export type AppShootDay = {
  title: string;
  duration_min: number;
  outfit: string;
  location: string;
  props: string[];
  order: Array<{
    shoot_order: number;
    script_title: string;
    duration_sec: number;
    note: string;
  }>;
  extra_ideas: Array<{
    title: string;
    hook: string;
    pillar: string;
    duration_sec: number;
  }>;
};

export type AppCalendarDay = {
  day: number;
  pillar: string;
  role: string;
  topic: string;
  platform_focus: string;
};

export type AppUsageSnapshot = {
  planId: string;
  limits: {
    scriptsPerMonth: number;
    analysesPerMonth: number;
    remakesPerMonth: number;
    autopsiesPerMonth: number;
    maxClientAccounts: number;
  };
  usage: {
    scripts: number;
    remakes: number;
    autopsies: number;
    analyses: number;
  };
  remaining: {
    scripts: number;
    analyses: number;
    remakes: number;
    autopsies: number;
  };
};

export type AppAnalysis = {
  id: string;
  status: string;
  niche?: string | null;
  targetAudience?: string | null;
  contentPillars?: Array<{ title: string; description: string }> | null;
  profileAuditTips?: string[] | null;
  shootDayPlan?: AppShootDay | null;
  pillarsCalendar?: AppCalendarDay[] | null;
  funnelKit?: AppFunnel | null;
  autopsyTemplate?: {
    weak_hook_fix: string;
    retention_fix: string;
    cta_fix: string;
    reshoot_hook: string;
  } | null;
  socialHandle: string;
  platform: string;
  errorMessage?: string | null;
  createdAt?: string;
  /** live = scraped; user = pasted links; mock = demo, not this handle */
  profileSource?: "live" | "mock" | "user" | null;
  aiMocked?: boolean;
  sourceVideos?: Array<{
    url: string;
    caption: string;
    views: number;
    likes?: number;
    durationSec?: number;
    retentionPct?: number;
    usedForSpeech: boolean;
  }> | null;
  scripts: AppScript[];
};

export type AppAnalysisSummary = {
  id: string;
  status: string;
  socialHandle: string;
  platform: string;
  niche?: string | null;
  createdAt: string;
};
