import assert from "node:assert/strict";
import { test } from "node:test";

import {
  apifyInputMentionsHandle,
  bareApifyHandle,
  handleFromApifyInput,
  isApifyHardLimitBody,
  shouldAttemptApifyReuse,
} from "@/lib/scraping/apify-reuse";

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
