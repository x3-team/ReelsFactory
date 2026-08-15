/**
 * Standalone honesty-policy checks (no path aliases).
 *   node --experimental-strip-types scripts/honesty-check.ts
 */
import { readFileSync } from "node:fs";
import {
  CORPUS_NO_LIVE_MESSAGE,
  CORPUS_PLATFORM_UNKNOWN_MESSAGE,
  HonestyError,
  NO_SCRAPE_LIVE_MESSAGE,
  TIKTOK_NEEDS_APIFY_MESSAGE,
  YOUTUBE_UNSUPPORTED_MESSAGE,
  allowMockProfile,
  assertCanAnalyzeProfile,
  canScrapePlatform,
  isMockScrapedProfile,
  resolveHonesty,
  resolveStrategyBackend,
} from "../src/lib/honesty.ts";
import { detectPlatform } from "../src/lib/platform.ts";
import {
  MIN_SUBMITTED_REELS,
  hasEnoughSubmittedReels,
  hasSubmittedReelSignal,
  parseRetentionHint,
  parseSubmittedReels,
} from "../src/lib/submitted-reels.ts";
import { TEST_CORPUS, lookupCorpus } from "../src/lib/test-corpus.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const lie = { AITUNNEL_API_KEY: "sk-test" };
assert(resolveHonesty(lie).mode === "blocked", "AI without scrape is blocked");
assert(!allowMockProfile(lie), "AI-only must not allow silent mock");
try {
  assertCanAnalyzeProfile("instagram", lie);
  throw new Error("expected throw");
} catch (error) {
  assert(error instanceof HonestyError, "HonestyError on lie");
  assert((error as HonestyError).message === NO_SCRAPE_LIVE_MESSAGE, "copy");
}

assert(resolveHonesty({}).mode === "demo", "no keys = labeled demo");
assert(allowMockProfile({}), "no keys may mock");

const explicit = { AITUNNEL_API_KEY: "sk-test", ALLOW_MOCK_PROFILE: "true" };
assert(resolveHonesty(explicit).mode === "demo", "explicit demo");
assert(resolveHonesty(explicit).forceMockAi === true, "demo forces mock AI");

const live = { APIFY_TOKEN: "apify", AITUNNEL_API_KEY: "sk" };
assert(resolveHonesty(live).mode === "live", "keys = live");
assert(canScrapePlatform("instagram", live), "ig + apify");
assert(canScrapePlatform("tiktok", live), "tt + apify");
assert(!canScrapePlatform("youtube", live), "yt never live");

const rapidOnly = { RAPIDAPI_KEY: "rapid" };
assert(canScrapePlatform("instagram", rapidOnly), "ig + rapid");
assert(!canScrapePlatform("tiktok", rapidOnly), "tt needs apify");
try {
  assertCanAnalyzeProfile("tiktok", rapidOnly);
  throw new Error("expected tiktok throw");
} catch (error) {
  assert(error instanceof HonestyError, "tiktok HonestyError");
  assert((error as HonestyError).message === TIKTOK_NEEDS_APIFY_MESSAGE, "tt copy");
}

try {
  assertCanAnalyzeProfile("youtube", live);
  throw new Error("expected youtube throw");
} catch (error) {
  assert((error as HonestyError).message === YOUTUBE_UNSUPPORTED_MESSAGE, "yt copy");
}

try {
  assertCanAnalyzeProfile("youtube", {});
  throw new Error("expected youtube throw in demo");
} catch (error) {
  assert(
    (error as HonestyError).message === YOUTUBE_UNSUPPORTED_MESSAGE,
    "yt never mocked",
  );
}

assert(detectPlatform("@kolodets") === "youtube", "kolodets is YT, not IG");
assert(detectPlatform("@investfutureru") === "youtube", "investfutureru is YT");
assert(detectPlatform("@homm9k") === "tiktok", "homm9k is TikTok");
assert(detectPlatform("@hommm9k") === "instagram", "hommm9k three m is IG");
assert(detectPlatform("@ksenia_makarchuk__") === "instagram", "double underscore");
assert(TEST_CORPUS.length === 16, "owner gave 16 handles, do not invent more");
assert(lookupCorpus("@karinakross")?.platform === "instagram", "karina IG");
assert(lookupCorpus("tanyatgym")?.platform === null, "tanyatgym platform unknown");

try {
  assertCanAnalyzeProfile("instagram", {}, { handle: "karinakross" });
  throw new Error("expected corpus no-live");
} catch (error) {
  assert(error instanceof HonestyError, "corpus HonestyError");
  assert((error as HonestyError).code === "CORPUS_NO_LIVE", "corpus code");
  assert((error as HonestyError).message === CORPUS_NO_LIVE_MESSAGE, "corpus copy");
}

try {
  assertCanAnalyzeProfile("instagram", { ALLOW_MOCK_PROFILE: "true" }, {
    handle: "kolodets",
  });
  throw new Error("expected kolodets refuse even with mock flag");
} catch (error) {
  assert(
    (error as HonestyError).message === YOUTUBE_UNSUPPORTED_MESSAGE ||
      (error as HonestyError).code === "CORPUS_NO_LIVE",
    "kolodets never mocked as IG lifestyle",
  );
}

try {
  assertCanAnalyzeProfile(detectPlatform("@kolodets"), { ALLOW_MOCK_PROFILE: "true" }, {
    handle: "kolodets",
  });
  throw new Error("expected kolodets youtube refuse");
} catch (error) {
  assert((error as HonestyError).code === "YOUTUBE", "kolodets youtube code");
}

try {
  assertCanAnalyzeProfile("instagram", {}, { handle: "tanyatgym" });
  throw new Error("expected unknown platform");
} catch (error) {
  assert(
    (error as HonestyError).message === CORPUS_PLATFORM_UNKNOWN_MESSAGE,
    "do not guess tanyatgym IG",
  );
}

assertCanAnalyzeProfile(
  "instagram",
  { APIFY_TOKEN: "apify" },
  { handle: "karinakross" },
);

assertCanAnalyzeProfile("instagram", {}, { handle: "reelsfactory.demo" });

assert(
  isMockScrapedProfile({
    topVideos: [{ id: "v1", audioUrl: "https://example.com/audio/1.mp3" }],
  }),
  "infer mock from example.com",
);
assert(
  !isMockScrapedProfile({
    source: "live",
    topVideos: [{ id: "v1", audioUrl: "https://example.com/audio/1.mp3" }],
  }),
  "explicit live wins",
);

const forced = { MOCK_EXTERNAL_APIS: "true", APIFY_TOKEN: "apify", AITUNNEL_API_KEY: "sk" };
assert(resolveHonesty(forced).mode === "demo", "MOCK_EXTERNAL_APIS wins");

assertCanAnalyzeProfile("instagram", lie, { hasUserReels: true });
assertCanAnalyzeProfile("youtube", lie, { hasUserReels: true });
assert(
  !isMockScrapedProfile({
    source: "user",
    topVideos: [{ id: "user-1", audioUrl: null }],
  }),
  "user-submitted is not mock",
);

assert(MIN_SUBMITTED_REELS === 3, "launch path asks for 3–5 links");
const three = parseSubmittedReels(
  [
    "https://instagram.com/reel/Aaa  торт без сахара, 12 тыс, 41% удержание",
    "https://instagram.com/reel/Bbb  разлом зефира",
    "https://instagram.com/reel/Ccc  фисташка и малина",
  ].join("\n"),
);
assert(three.length === 3 && three[0].retentionPct === 41, "retention parsed");
assert(hasEnoughSubmittedReels(three) && hasSubmittedReelSignal(three), "user signal");
assert(parseRetentionHint("удержание 38%") === 38, "retention before number");
assert(!hasEnoughSubmittedReels(three.slice(0, 2)), "two links not enough");

const liveProfile = {
  source: "live" as const,
  topVideos: [{ id: "1", audioUrl: "https://instagram.com/x.mp4" }],
};
const mockProfile = {
  source: "mock" as const,
  topVideos: [{ id: "v1", audioUrl: "https://example.com/audio/1.mp3" }],
};
assert(
  resolveStrategyBackend(liveProfile, { APIFY_TOKEN: "apify" }) === "local-shell",
  "live scrape without AI uses local-shell, not 48k mock",
);
assert(
  resolveStrategyBackend(liveProfile, live) === "llm",
  "live scrape + AI uses llm",
);
assert(
  resolveStrategyBackend(mockProfile, live) === "mock",
  "mock profile stays mock even with AI",
);
assert(
  resolveHonesty({ APIFY_TOKEN: "apify" }).warning?.includes("без демо-хуков"),
  "scrape-only warning is honest",
);

const aitunnelSrc = readFileSync(new URL("../src/lib/ai/aitunnel.ts", import.meta.url), "utf8");
assert(aitunnelSrc.includes('"gpt-5.6-luna"'), "default model is luna");
assert(aitunnelSrc.includes('"gpt-5.6-terra"'), "pro model stays terra");
assert(aitunnelSrc.includes('"whisper-1"'), "whisper stays whisper-1");
assert(
  !aitunnelSrc.includes('"deepseek-v4-flash"'),
  "flash is no longer the hardcoded default",
);
const strategySrc = readFileSync(
  new URL("../src/lib/ai/generate-strategy.ts", import.meta.url),
  "utf8",
);
assert(
  !strategySrc.includes("using local shell"),
  "live LLM must not silently fall back to local-shell",
);
assert(
  strategySrc.includes("Живая стратегия не собралась"),
  "LLM failure stays visible",
);

console.log("honesty-check: ok");
