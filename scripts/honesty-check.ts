/**
 * Standalone honesty-policy checks (no path aliases).
 *   node --experimental-strip-types scripts/honesty-check.ts
 */
import {
  HonestyError,
  NO_SCRAPE_LIVE_MESSAGE,
  TIKTOK_NEEDS_APIFY_MESSAGE,
  YOUTUBE_UNSUPPORTED_MESSAGE,
  allowMockProfile,
  assertCanAnalyzeProfile,
  canScrapePlatform,
  isMockScrapedProfile,
  resolveHonesty,
} from "../src/lib/honesty.ts";

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

console.log("honesty-check: ok");
