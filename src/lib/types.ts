export type ContentPillar = {
  title: string;
  description: string;
};

export type GeneratedScript = {
  title: string;
  format: string;
  hook_options: string[];
  teleprompter_script: string;
  caption: string;
  cta: string;
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
