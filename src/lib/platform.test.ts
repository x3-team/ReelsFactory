import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertSupportedPlatform,
  detectPlatform,
  isSupportedPlatform,
  YOUTUBE_UNSUPPORTED_MESSAGE,
} from "@/lib/platform";

test("YouTube is an explicit refusal, including corpus handles", () => {
  assert.equal(detectPlatform("https://youtube.com/@linguamarina"), "youtube");
  assert.equal(detectPlatform("linguamarina"), "youtube");
  assert.equal(detectPlatform("https://youtu.be/abc"), "youtube");
  assert.equal(isSupportedPlatform("youtube"), false);
  assert.equal(isSupportedPlatform("instagram"), true);
  assert.equal(isSupportedPlatform("tiktok"), true);
  assert.throws(
    () => assertSupportedPlatform("youtube"),
    (err: Error) => err.message === YOUTUBE_UNSUPPORTED_MESSAGE,
  );
});

test("Instagram and TikTok corpus handles stay supported", () => {
  assert.equal(detectPlatform("desertmsk"), "instagram");
  assert.equal(detectPlatform("@eugenius_official"), "tiktok");
  assert.doesNotThrow(() => assertSupportedPlatform("instagram"));
  assert.doesNotThrow(() => assertSupportedPlatform("tiktok"));
});
