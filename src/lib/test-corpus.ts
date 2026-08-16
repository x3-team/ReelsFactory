/**
 * Public CIS test accounts supplied by the owner (2026-08-15),
 * recorded in docs/CIS_TEST_CORPUS.md on PR #6.
 * Handles are real. Do not invent extra @.
 */

export type CorpusPlatform = "instagram" | "tiktok" | "youtube";

export type CorpusEntry = {
  handle: string;
  platform: CorpusPlatform | null;
  note: string;
  aliases?: Array<{ handle: string; platform: CorpusPlatform | null }>;
};

export const TEST_CORPUS: CorpusEntry[] = [
  { handle: "karinakross", platform: "instagram", note: "IG юмор" },
  { handle: "victoriabonya", platform: "instagram", note: "IG лайфстайл" },
  { handle: "goar_avetisyan", platform: "instagram", note: "IG визаж" },
  { handle: "krava_nakormit", platform: "tiktok", note: "TikTok еда" },
  { handle: "prodasha_live", platform: "instagram", note: "IG еда" },
  { handle: "linguamarina", platform: "youtube", note: "YouTube — не скрейпим" },
  {
    handle: "homm9k",
    platform: "tiktok",
    note: "TikTok; IG-алиас @hommm9k (три m)",
    aliases: [{ handle: "hommm9k", platform: "instagram" }],
  },
  { handle: "a4a4a4a4", platform: "youtube", note: "YouTube" },
  { handle: "tanyatgym", platform: null, note: "площадка не указана" },
  { handle: "agre_daria_fit", platform: "instagram", note: "IG фитнес" },
  {
    handle: "oskarhartmann1",
    platform: "youtube",
    note: "YouTube; IG-алиас @oskar_hartmann",
    aliases: [{ handle: "oskar_hartmann", platform: "instagram" }],
  },
  { handle: "ksenia_makarchuk__", platform: "instagram", note: "IG финансы СПб" },
  { handle: "eugenius_official", platform: "tiktok", note: "TikTok математика" },
  { handle: "botagozomarova2", platform: "tiktok", note: "TikTok, Достык" },
  { handle: "kolodets", platform: "youtube", note: "YouTube колодцы МО" },
  { handle: "investfutureru", platform: "youtube", note: "YouTube аналитика" },
  { handle: "desertmsk", platform: "instagram", note: "IG, реальный прогон в AGENTS.md" },
];

function bareHandle(input: string): string {
  const trimmed = input.trim();
  const withoutUrl = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?/i, "")
    .replace(/^(instagram|tiktok)\.com\//i, "")
    .replace(/^youtube\.com\/(@)?/i, "")
    .replace(/^youtu\.be\//i, "")
    .replace(/^@/, "");
  return (withoutUrl.split(/[/?#]/)[0] || "").toLowerCase();
}

const INDEX = new Map<
  string,
  { handle: string; platform: CorpusPlatform | null }
>();

for (const entry of TEST_CORPUS) {
  INDEX.set(entry.handle.toLowerCase(), {
    handle: entry.handle,
    platform: entry.platform,
  });
  for (const alias of entry.aliases || []) {
    INDEX.set(alias.handle.toLowerCase(), {
      handle: alias.handle,
      platform: alias.platform,
    });
  }
}

export function lookupCorpus(input?: string | null) {
  if (!input) return null;
  return INDEX.get(bareHandle(input)) ?? null;
}

/** Handles we can scrape live after the Apify quota bump (IG + TikTok only). */
export function liveScrapeTargets() {
  return TEST_CORPUS.filter(
    (entry) => entry.platform === "instagram" || entry.platform === "tiktok",
  );
}
