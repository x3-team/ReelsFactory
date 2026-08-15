import { lookupCorpus } from "./test-corpus.ts";

export type Platform = "instagram" | "tiktok" | "youtube";

export function formatPlatform(platform?: string | null) {
  switch ((platform || "").toLowerCase()) {
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "youtube":
      return "YouTube";
    default:
      return platform || "Instagram";
  }
}

export function detectPlatformFromUrl(input: string): Platform | null {
  const value = input.trim().toLowerCase();
  if (value.includes("tiktok.com") || (value.startsWith("@") && value.includes("tiktok"))) {
    return "tiktok";
  }
  if (
    value.includes("youtube.com") ||
    value.includes("youtu.be") ||
    value.includes("/channel/") ||
    value.includes("@yt")
  ) {
    return "youtube";
  }
  if (value.includes("instagram.com")) {
    return "instagram";
  }
  return null;
}

export function detectPlatform(input: string): Platform {
  const fromUrl = detectPlatformFromUrl(input);
  if (fromUrl) return fromUrl;
  const corpus = lookupCorpus(input);
  if (corpus?.platform) return corpus.platform;
  return "instagram";
}

export function normalizeHandle(input: string, platform: Platform): string {
  const trimmed = input.trim();
  if (platform === "youtube") {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  const withoutUrl = trimmed
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "")
    .replace(/\/$/, "")
    .replace(/^@/, "");
  return withoutUrl.split(/[/?#]/)[0] || trimmed;
}
