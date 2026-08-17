import assert from "node:assert/strict";
import { test } from "node:test";

import { applyLifecycleTimestamps } from "@/lib/scripts/lifecycle";

test("published also marks shot; ready clears both", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");
  assert.deepEqual(applyLifecycleTimestamps("shot", now), {
    shotAt: now,
    publishedAt: null,
  });
  assert.deepEqual(applyLifecycleTimestamps("published", now), {
    shotAt: now,
    publishedAt: now,
  });
  assert.deepEqual(applyLifecycleTimestamps("ready", now), {
    shotAt: null,
    publishedAt: null,
  });
});
