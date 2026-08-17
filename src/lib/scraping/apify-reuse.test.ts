import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ApifyBlockedError,
  apifyInputMentionsHandle,
  bareApifyHandle,
  handleFromApifyInput,
  isApifyHardLimitBody,
  shouldAttemptApifyReuse,
  shouldFallbackToRapidApi,
} from "@/lib/scraping/apify-reuse";
import {
  APIFY_HARD_LIMIT_NO_REUSE_MESSAGE,
  APIFY_REUSE_TIP,
  shouldShowReuseBanner,
} from "@/lib/ai/honesty-copy";

test("403/402 always attempt reuse, even without the monthly-limit phrase", () => {
  assert.equal(
    isApifyHardLimitBody(
      403,
      '{"error":{"type":"platform-feature-disabled","message":"Monthly usage hard limit exceeded"}}',
    ),
    true,
  );
  assert.equal(isApifyHardLimitBody(402, "hard limit"), true);
  assert.equal(isApifyHardLimitBody(500, "oops"), false);
  assert.equal(isApifyHardLimitBody(403, "forbidden for another reason"), false);

  assert.equal(shouldAttemptApifyReuse(403, "forbidden for another reason"), true);
  assert.equal(shouldAttemptApifyReuse(403, ""), true);
  assert.equal(shouldAttemptApifyReuse(402, ""), true);
  assert.equal(shouldAttemptApifyReuse(500, "oops"), false);
  assert.equal(shouldAttemptApifyReuse(401, "unauthorized"), false);
});

test("reuse matching is per-handle, not the previous actor run", () => {
  assert.equal(bareApifyHandle("@Ksenia_Makarchuk__"), "ksenia_makarchuk__");
  assert.equal(
    bareApifyHandle("https://www.instagram.com/prodasha_live/"),
    "prodasha_live",
  );
  assert.equal(handleFromApifyInput({ usernames: ["agre_daria_fit"] }), "agre_daria_fit");
  assert.equal(
    apifyInputMentionsHandle(
      { profiles: ["https://www.tiktok.com/@eugenius_official"] },
      "eugenius_official",
    ),
    true,
  );
  assert.equal(
    apifyInputMentionsHandle({ usernames: ["desertmsk"] }, "prodasha_live"),
    false,
  );
});

test("403 without reuse is a refusal, not RapidAPI or mock success", () => {
  const limit = new ApifyBlockedError({ status: 403, hardLimit: true });
  assert.equal(limit.message, APIFY_HARD_LIMIT_NO_REUSE_MESSAGE);
  assert.equal(shouldFallbackToRapidApi(limit), false);
  assert.equal(shouldFallbackToRapidApi(new Error("timeout")), true);
  assert.match(limit.message, /не «разбор прошёл»/);
});

test("reuse banner only for apify-reuse, not a live run", () => {
  assert.equal(shouldShowReuseBanner({ scrapeMode: "apify-reuse" }), true);
  assert.equal(shouldShowReuseBanner({ scrapeMode: "live-run" }), false);
  assert.equal(
    shouldShowReuseBanner({ scrapeMode: null, profileAuditTips: [APIFY_REUSE_TIP] }),
    true,
  );
});
