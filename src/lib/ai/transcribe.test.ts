import assert from "node:assert/strict";
import { test } from "node:test";

import { fallbackTranscription } from "@/lib/ai/transcribe";

test("live Whisper failure does not inject mock teleprompter into anchors", () => {
  const prev = process.env.MOCK_EXTERNAL_APIS;
  process.env.MOCK_EXTERNAL_APIS = "false";
  try {
    const result = fallbackTranscription("Том Ям");
    assert.equal(result.mocked, true);
    assert.equal(result.text, "");
  } finally {
    if (prev === undefined) delete process.env.MOCK_EXTERNAL_APIS;
    else process.env.MOCK_EXTERNAL_APIS = prev;
  }
});

test("mock mode still returns a caption-hinted transcription", () => {
  const prev = process.env.MOCK_EXTERNAL_APIS;
  process.env.MOCK_EXTERNAL_APIS = "true";
  try {
    const result = fallbackTranscription("Том Ям");
    assert.equal(result.mocked, true);
    assert.match(result.text, /Том Ям/);
  } finally {
    if (prev === undefined) delete process.env.MOCK_EXTERNAL_APIS;
    else process.env.MOCK_EXTERNAL_APIS = prev;
  }
});
