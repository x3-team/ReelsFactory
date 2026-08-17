export type ContentPillar = {
  title: string;
  description: string;
};

export type VisualCues = {
  start0_3s?: string;
  midAction?: string;
  finalCta?: string;
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
  visual_cues?: VisualCues;
};

export type StrategyPayload = {
  niche: string;
  target_audience: string;
  content_pillars: ContentPillar[];
  profile_audit_tips: string[];
  scripts: GeneratedScript[];
};

export type ScrapedVideo = {
  id: string;
  url: string;
  caption?: string;
  views: number;
  likes?: number;
  audioUrl?: string;
  /** Прямой файл видео (TT: mediaUrls / downloadAddr), если актор его отдал */
  videoUrl?: string;
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
  /** live-run = new Apify actor run; apify-reuse = paid dataset after 403 */
  scrapeMode?: "live-run" | "apify-reuse";
};
