import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAPTION_VIDEOS_LIMIT,
  WHISPER_MAX_VIDEOS,
  videosForWhisper,
} from "@/lib/content/scrape-limits";

test("Whisper stays on top-3, not every reel", () => {
  assert.equal(WHISPER_MAX_VIDEOS, 3);
  assert.ok(CAPTION_VIDEOS_LIMIT > WHISPER_MAX_VIDEOS);

  const eight = Array.from({ length: 8 }, (_, i) => ({ id: `v${i + 1}` }));
  const picked = videosForWhisper(eight);
  assert.equal(picked.length, 3);
  assert.deepEqual(
    picked.map((v) => v.id),
    ["v1", "v2", "v3"],
  );
  assert.equal(videosForWhisper(undefined).length, 0);
  assert.equal(videosForWhisper([]).length, 0);
});
