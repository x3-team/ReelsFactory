import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clampRemainingSec,
  formatTeleprompterClock,
  reelDurationSec,
  teleprompterScrollPxPerSec,
} from "@/lib/teleprompter/timing";

test("clock formats 15/30/45 as m:ss", () => {
  assert.equal(formatTeleprompterClock(15), "0:15");
  assert.equal(formatTeleprompterClock(30), "0:30");
  assert.equal(formatTeleprompterClock(45), "0:45");
  assert.equal(formatTeleprompterClock(0), "0:00");
  assert.equal(formatTeleprompterClock(-3), "0:00");
});

test("remaining clock is the reel length, not scroll speed", () => {
  assert.equal(clampRemainingSec(0, 15), 15);
  assert.equal(clampRemainingSec(5000, 15), 10);
  assert.equal(clampRemainingSec(15000, 15), 0);
  assert.equal(clampRemainingSec(20000, 15), 0);
});

test("invalid duration falls back to 15", () => {
  assert.equal(reelDurationSec(15), 15);
  assert.equal(reelDurationSec(45), 45);
  assert.equal(reelDurationSec(0), 15);
  assert.equal(reelDurationSec(12), 15);
});

test("normal scroll finishes in durationSec", () => {
  const px = teleprompterScrollPxPerSec({
    distancePx: 300,
    durationSec: 15,
    scrollFactor: 1,
  });
  assert.equal(px, 20);
  const fast = teleprompterScrollPxPerSec({
    distancePx: 300,
    durationSec: 15,
    scrollFactor: 1.35,
  });
  assert.ok(fast > px);
});
