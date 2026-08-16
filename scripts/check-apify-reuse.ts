import assert from "node:assert/strict";

import {
  apifyInputMentionsHandle,
  bareApifyHandle,
  handleFromApifyInput,
  isApifyHardLimitBody,
  shouldAttemptApifyReuse,
} from "../src/lib/scraping/apify-reuse";

assert.equal(bareApifyHandle("@Ksenia_Makarchuk__"), "ksenia_makarchuk__");
assert.equal(
  bareApifyHandle("https://www.instagram.com/prodasha_live/"),
  "prodasha_live",
);
assert.equal(handleFromApifyInput({ usernames: ["agre_daria_fit"] }), "agre_daria_fit");
assert.equal(
  apifyInputMentionsHandle({ profiles: ["https://www.tiktok.com/@eugenius_official"] }, "eugenius_official"),
  true,
);
assert.equal(isApifyHardLimitBody(403, '{"error":{"type":"platform-feature-disabled","message":"Monthly usage hard limit exceeded"}}'), true);
assert.equal(isApifyHardLimitBody(402, "hard limit"), true);
assert.equal(isApifyHardLimitBody(500, "oops"), false);
assert.equal(isApifyHardLimitBody(403, "forbidden for another reason"), false);
assert.equal(shouldAttemptApifyReuse(403, "forbidden for another reason"), true);
assert.equal(shouldAttemptApifyReuse(402, ""), true);
assert.equal(shouldAttemptApifyReuse(500, "oops"), false);

console.log("apify-reuse checks ok");
