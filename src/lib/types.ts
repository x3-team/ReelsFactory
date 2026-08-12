export type ContentPillar = {
  title: string;
  description: string;
};

/** Cross-platform pack from one shoot */
export type PlatformPack = {
  /** Instagram Reels */
  reels: {
    caption: string;
    cta: string;
    hashtags?: string[];
  };
  /** VK Клипы */
  vk_clips: {
    caption: string;
    cta: string;
  };
  /** YouTube Shorts */
  shorts: {
    title: string;
    description: string;
    cta: string;
  };
  /** Telegram channel post adaptation */
  telegram_post: {
    text: string;
    cta: string;
  };
};

/** Comment-keyword → Telegram funnel */
export type FunnelKit = {
  comment_keyword: string;
  bot_reply: string;
  lead_magnet: string;
  telegram_cta: string;
};

export type GeneratedScript = {
  title: string;
  format: string;
  /** Target reel length in seconds (15 | 30 | 45 | 60) */
  duration_sec?: number;
  hook_options: string[];
  teleprompter_script: string;
  caption: string;
  cta: string;
  /** What to prepare before camera */
  props_checklist?: string[];
  /** Order in shoot-day session (1-based) */
  shoot_order?: number;
  /** Soft funnel keyword CTA */
  comment_keyword?: string;
  platform_packs?: PlatformPack;
  funnel?: FunnelKit;
};

export type ShootDayPlan = {
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

export type PillarsCalendarDay = {
  day: number;
  pillar: string;
  role: "trust" | "expert" | "offer" | "social_proof" | "entertainment";
  topic: string;
  platform_focus: "reels" | "vk" | "shorts" | "telegram";
};

export type AutopsyHint = {
  weak_hook_fix: string;
  retention_fix: string;
  cta_fix: string;
  reshoot_hook: string;
};

export type StrategyPayload = {
  niche: string;
  target_audience: string;
  content_pillars: ContentPillar[];
  profile_audit_tips: string[];
  scripts: GeneratedScript[];
  shoot_day?: ShootDayPlan;
  pillars_calendar?: PillarsCalendarDay[];
  funnel_kit?: FunnelKit;
  autopsy_template?: AutopsyHint;
};

export type ScrapedVideo = {
  id: string;
  url: string;
  caption?: string;
  views: number;
  likes?: number;
  audioUrl?: string;
  durationSec?: number;
};

export type ScrapedProfile = {
  handle: string;
  platform: "instagram" | "tiktok" | "youtube";
  displayName?: string;
  bio: string;
  followers: number;
  following?: number;
  postsCount?: number;
  topVideos: ScrapedVideo[];
};

export type ViralRemakePayload = {
  source_url: string;
  source_structure: {
    hook: string;
    conflict: string;
    demo: string;
    cta: string;
  };
  remake: GeneratedScript;
  platform_packs: PlatformPack;
  funnel: FunnelKit;
};

export type AutopsyPayload = {
  source_url: string;
  score: number;
  findings: AutopsyHint;
  rewritten_hooks: string[];
  reshoot_script: GeneratedScript;
};
