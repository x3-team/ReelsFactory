import assert from "node:assert/strict";
import { test } from "node:test";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { isUsableTeleprompter } from "@/lib/ai/normalize-strategy";
import { mockScrapedProfile } from "@/lib/mocks/demo-data";

test("mock generateStrategy never ships an empty teleprompter", async () => {
  const prev = process.env.MOCK_EXTERNAL_APIS;
  process.env.MOCK_EXTERNAL_APIS = "true";
  try {
    const result = await generateStrategy({
      profile: mockScrapedProfile("desertmsk", "instagram"),
      transcriptions: ["Хук про зефир и температуру."],
      goal: "GROW_AUDIENCE",
      tone: "EXPERT",
      plan: "FREE",
    });
    assert.equal(result.mocked, true);
    assert.equal(result.model, "mock");
    assert.equal(result.strategy.scripts.length, 3);
    assert.deepEqual(
      result.strategy.scripts.map((s) => s.duration_sec),
      [15, 30, 45],
    );
    for (const script of result.strategy.scripts) {
      assert.ok(script.teleprompter_script.trim());
      assert.equal(
        isUsableTeleprompter(script.teleprompter_script, script.duration_sec || 30),
        true,
      );
    }
  } finally {
    if (prev === undefined) delete process.env.MOCK_EXTERNAL_APIS;
    else process.env.MOCK_EXTERNAL_APIS = prev;
  }
});
