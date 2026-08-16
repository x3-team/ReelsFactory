import { lookupCorpus } from "@/lib/test-corpus";

export type Platform = "instagram" | "tiktok" | "youtube";
export type SupportedPlatform = "instagram" | "tiktok";

export const YOUTUBE_UNSUPPORTED_MESSAGE =
  "YouTube пока не разбираем. Укажите открытый Instagram или TikTok.";

export function detectPlatform(input: string): Platform {
  const value = input.trim().toLowerCase();
  const corpus = lookupCorpus(value);
  if (corpus?.platform) return corpus.platform;
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
  return "instagram";
}

export function isSupportedPlatform(
  platform: string | null | undefined,
): platform is SupportedPlatform {
  return platform === "instagram" || platform === "tiktok";
}

export function assertSupportedPlatform(
  platform: string | null | undefined,
): asserts platform is SupportedPlatform {
  if (platform === "youtube") {
    throw new Error(YOUTUBE_UNSUPPORTED_MESSAGE);
  }
  if (!isSupportedPlatform(platform)) {
    throw new Error(YOUTUBE_UNSUPPORTED_MESSAGE);
  }
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
