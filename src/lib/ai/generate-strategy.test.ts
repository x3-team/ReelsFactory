import assert from "node:assert/strict";
import { test } from "node:test";

import {
  generateStrategy,
  STRATEGY_SYSTEM_PROMPT,
} from "@/lib/ai/generate-strategy";
import {
  DESERTMSK_LIVE_PROFILE,
  DESERTMSK_LIVE_WHISPER_RAW,
} from "@/lib/ai/fixtures/desertmsk-live";
import {
  DARIA_BIO,
  DARIA_CAPTIONS,
  DARIA_WHISPER_RAW,
} from "@/lib/ai/fixtures/cis-corpus-live";
import { isUsableTeleprompter } from "@/lib/ai/normalize-strategy";
import { mockScrapedProfile } from "@/lib/mocks/demo-data";
import { scriptHasSourceAnchor, sourceCorpus } from "@/lib/ai/source-anchors";

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
      assert.doesNotMatch(script.teleprompter_script, /произнесите|покажите на экране/i);
      assert.doesNotMatch(script.teleprompter_script, /контент-машин|viral hooks/i);
    }
    assert.match(result.strategy.scripts[0]!.teleprompter_script, /зефир|агар|сироп/i);
  } finally {
    if (prev === undefined) delete process.env.MOCK_EXTERNAL_APIS;
    else process.env.MOCK_EXTERNAL_APIS = prev;
  }
});

test("strategy prompt asks for spoken teleprompter, not office slogans", () => {
  assert.match(STRATEGY_SYSTEM_PROMPT, /устн/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /режиссёрские ремарки/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /три РАЗНЫХ угла/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /ЯКОРЬ/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /НЕ притворяйся/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /source_strength/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /огонь/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /GUARDRAIL/i);
  assert.match(STRATEGY_SYSTEM_PROMPT, /visual_cues/i);
  assert.doesNotMatch(STRATEGY_SYSTEM_PROMPT, /не пересказывай дословно транскрипт/i);
  assert.doesNotMatch(STRATEGY_SYSTEM_PROMPT, /nano|haiku|gemini|flash-lite/i);
});

test("mock generateStrategy on live desertmsk fixture keeps caption anchors", async () => {
  const prev = process.env.MOCK_EXTERNAL_APIS;
  process.env.MOCK_EXTERNAL_APIS = "true";
  try {
    const result = await generateStrategy({
      profile: DESERTMSK_LIVE_PROFILE,
      transcriptions: DESERTMSK_LIVE_WHISPER_RAW.map((item) => item.text),
      goal: "GROW_AUDIENCE",
      tone: "EXPERT",
      plan: "START",
    });
    assert.equal(result.mocked, true);
    const corpus = sourceCorpus({
      bio: DESERTMSK_LIVE_PROFILE.bio,
      captions: DESERTMSK_LIVE_PROFILE.topVideos.map((video) => video.caption || ""),
      transcriptions: DESERTMSK_LIVE_WHISPER_RAW.map((item) => item.text),
    });
    assert.equal(corpus.voiceHeard, false);
    assert.match(result.strategy.profile_audit_tips[0] || "", /подпис/i);
    for (const script of result.strategy.scripts) {
      assert.equal(scriptHasSourceAnchor(script, corpus.texts).ok, true);
    }
    const blob = result.strategy.scripts
      .map((script) => script.teleprompter_script)
      .join("\n");
    assert.match(blob, /отсаж|кусочк/i);
    assert.match(blob, /птичьего молока|сливочного масла/i);
    assert.match(blob, /маршмеллоу|пружин/i);
  } finally {
    if (prev === undefined) delete process.env.MOCK_EXTERNAL_APIS;
    else process.env.MOCK_EXTERNAL_APIS = prev;
  }
});

test("mock generateStrategy on duplicate fitness captions stays thin, not fire", async () => {
  const prev = process.env.MOCK_EXTERNAL_APIS;
  process.env.MOCK_EXTERNAL_APIS = "true";
  try {
    const profile = mockScrapedProfile("agre_daria_fit", "instagram");
    profile.bio = DARIA_BIO;
    profile.topVideos = DARIA_CAPTIONS.map((caption, index) => ({
      id: `daria-${index}`,
      url: `https://instagram.com/p/${index}`,
      caption,
      views: 1000 - index,
    }));
    const result = await generateStrategy({
      profile,
      transcriptions: DARIA_WHISPER_RAW,
      goal: "GROW_AUDIENCE",
      tone: "DIRECT",
      plan: "START",
    });
    assert.equal(result.mocked, true);
    const corpus = sourceCorpus({
      bio: DARIA_BIO,
      captions: DARIA_CAPTIONS,
      transcriptions: DARIA_WHISPER_RAW,
    });
    assert.equal(corpus.strength, "weak");
    assert.equal(corpus.voiceHeard, false);
    assert.match(result.strategy.profile_audit_tips[0] || "", /огонь|копипаст|подпис/i);
    const blob = result.strategy.scripts.map((script) => script.teleprompter_script).join("\n");
    assert.doesNotMatch(blob, /ноги|пресс|суперсет/i);
    for (const script of result.strategy.scripts) {
      assert.equal(scriptHasSourceAnchor(script, corpus.texts).ok, true);
    }
  } finally {
    if (prev === undefined) delete process.env.MOCK_EXTERNAL_APIS;
    else process.env.MOCK_EXTERNAL_APIS = prev;
  }
});
