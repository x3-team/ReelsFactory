/**
 * Public CIS test accounts supplied by the owner (2026-08-15).
 * Handles are real. Do not invent extra @. Empty IG was not added.
 *
 * This is a guard list, not scrape results. Presence here does not mean
 * we analyzed the account.
 */

export type CorpusTier = "large" | "mid" | "niche";

export type CorpusPlatform = "instagram" | "tiktok" | "youtube";

export type CorpusEntry = {
  id: string;
  handle: string;
  platform: CorpusPlatform | null;
  tier: CorpusTier;
  note: string;
  firstBatch?: boolean;
  aliases?: Array<{ handle: string; platform: CorpusPlatform | null; note?: string }>;
};

export type CorpusHit = {
  entry: CorpusEntry;
  handle: string;
  platform: CorpusPlatform | null;
  viaAlias: boolean;
};

export const TEST_CORPUS: CorpusEntry[] = [
  {
    id: "karinakross",
    handle: "karinakross",
    platform: "instagram",
    tier: "large",
    note: "IG юмор",
    firstBatch: true,
  },
  {
    id: "victoriabonya",
    handle: "victoriabonya",
    platform: "instagram",
    tier: "large",
    note: "IG лайфстайл",
  },
  {
    id: "goar_avetisyan",
    handle: "goar_avetisyan",
    platform: "instagram",
    tier: "large",
    note: "IG визаж",
  },
  {
    id: "krava_nakormit",
    handle: "krava_nakormit",
    platform: "tiktok",
    tier: "large",
    note: "TikTok еда",
  },
  {
    id: "prodasha_live",
    handle: "prodasha_live",
    platform: "instagram",
    tier: "large",
    note: "IG еда",
  },
  {
    id: "linguamarina",
    handle: "linguamarina",
    platform: "youtube",
    tier: "large",
    note: "YouTube — live-скрейпа нет, отказ 400, не мок",
  },
  {
    id: "homm9k",
    handle: "homm9k",
    platform: "tiktok",
    tier: "large",
    note: "TikTok; IG-алиас @hommm9k (три m)",
    firstBatch: true,
    aliases: [{ handle: "hommm9k", platform: "instagram", note: "IG, три m" }],
  },
  {
    id: "a4a4a4a4",
    handle: "a4a4a4a4",
    platform: "youtube",
    tier: "large",
    note: "YouTube; IG/TT @a4omg — без URL площадку не угадываем",
    aliases: [
      {
        handle: "a4omg",
        platform: null,
        note: "IG и TikTok одновременно — нужен URL",
      },
    ],
  },
  {
    id: "tanyatgym",
    handle: "tanyatgym",
    platform: null,
    tier: "mid",
    note: "владелец не указал площадку — не утверждаем Instagram",
  },
  {
    id: "agre_daria_fit",
    handle: "agre_daria_fit",
    platform: "instagram",
    tier: "mid",
    note: "IG фитнес",
    firstBatch: true,
  },
  {
    id: "oskarhartmann1",
    handle: "oskarhartmann1",
    platform: "youtube",
    tier: "mid",
    note: "YouTube бизнес; IG-алиас @oskar_hartmann",
    aliases: [{ handle: "oskar_hartmann", platform: "instagram" }],
  },
  {
    id: "ksenia_makarchuk__",
    handle: "ksenia_makarchuk__",
    platform: "instagram",
    tier: "mid",
    note: "IG финансы СПб, двойное _",
    firstBatch: true,
  },
  {
    id: "eugenius_official",
    handle: "eugenius_official",
    platform: "tiktok",
    tier: "mid",
    note: "TikTok математика Алматы",
  },
  {
    id: "botagozomarova2",
    handle: "botagozomarova2",
    platform: "tiktok",
    tier: "niche",
    note: "TikTok, село Достык",
  },
  {
    id: "kolodets",
    handle: "kolodets",
    platform: "youtube",
    tier: "niche",
    note: "YouTube колодцы МО — не «лайфстайл стратегия огонь»",
    firstBatch: true,
  },
  {
    id: "investfutureru",
    handle: "investfutureru",
    platform: "youtube",
    tier: "niche",
    note: "YouTube длинная аналитика — не «стратегия огонь для Reels»",
    firstBatch: true,
  },
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

const INDEX = new Map<string, CorpusHit>();

for (const entry of TEST_CORPUS) {
  INDEX.set(entry.handle.toLowerCase(), {
    entry,
    handle: entry.handle,
    platform: entry.platform,
    viaAlias: false,
  });
  for (const alias of entry.aliases || []) {
    INDEX.set(alias.handle.toLowerCase(), {
      entry,
      handle: alias.handle,
      platform: alias.platform,
      viaAlias: true,
    });
  }
}

export function lookupCorpus(input?: string | null): CorpusHit | null {
  if (!input) return null;
  return INDEX.get(bareHandle(input)) ?? null;
}

export function isCorpusHandle(input?: string | null): boolean {
  return Boolean(lookupCorpus(input));
}

export function firstBatchHandles(): string[] {
  return TEST_CORPUS.filter((entry) => entry.firstBatch).map((entry) => entry.handle);
}

export function corpusLiveKind(
  hit: CorpusHit | null,
): "instagram" | "tiktok" | "youtube-unsupported" | "unknown" {
  if (!hit?.platform) return "unknown";
  if (hit.platform === "youtube") return "youtube-unsupported";
  return hit.platform;
}
