export type Platform = "instagram" | "tiktok";

export function isYouTubeInput(input: string) {
  const value = input.trim().toLowerCase();
  return (
    value.includes("youtube.com") ||
    value.includes("youtu.be") ||
    value.includes("/channel/") ||
    value.includes("@yt")
  );
}

export function detectPlatform(input: string): Platform {
  const value = input.trim().toLowerCase();
  if (isYouTubeInput(value)) {
    throw new Error(
      "YouTube пока не поддерживаем — укажи Instagram или TikTok",
    );
  }
  if (value.includes("tiktok.com") || (value.startsWith("@") && value.includes("tiktok"))) {
    return "tiktok";
  }
  return "instagram";
}

export function normalizeHandle(input: string, platform?: Platform): string {
  void platform;
  const trimmed = input.trim();
  const withoutUrl = trimmed
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "")
    .replace(/\/$/, "")
    .replace(/^@/, "");
  return withoutUrl.split(/[/?#]/)[0] || trimmed;
}
