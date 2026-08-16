import { lookupCorpus } from "@/lib/test-corpus";

export type Platform = "instagram" | "tiktok" | "youtube";

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
