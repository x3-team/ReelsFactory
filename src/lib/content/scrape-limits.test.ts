import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAPTION_VIDEOS_LIMIT,
  WHISPER_MAX_VIDEOS,
  videosForWhisper,
  whisperSourceUrl,
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

test("TikTok top-3 for Whisper matches IG: first ranked with media", () => {
  const ig = Array.from({ length: 8 }, (_, i) => ({
    id: `ig${i + 1}`,
    audioUrl: `https://cdn.example/ig${i + 1}.mp4`,
  }));
  const tt = Array.from({ length: 8 }, (_, i) => ({
    id: `tt${i + 1}`,
    audioUrl: `https://v16m.tiktokcdn-us.com/audio${i + 1}`,
  }));
  assert.deepEqual(
    videosForWhisper(ig).map((v) => v.id),
    ["ig1", "ig2", "ig3"],
  );
  assert.deepEqual(
    videosForWhisper(tt).map((v) => v.id),
    ["tt1", "tt2", "tt3"],
  );
});

test("videosForWhisper prefers rows with audio/video over watch-page-only", () => {
  const mixed = [
    { id: "page", url: "https://www.tiktok.com/@eugenius_official/video/1" },
    { id: "audio", audioUrl: "https://v16m.tiktokcdn-us.com/a.mp3" },
    { id: "file", videoUrl: "https://v16-webapp-prime.tiktok.com/v.mp4" },
    { id: "later", audioUrl: "https://sf16.tiktokcdn-us.com/b.mp3" },
  ];
  assert.deepEqual(
    videosForWhisper(mixed).map((v) => v.id),
    ["audio", "file", "later"],
  );
});

test("whisperSourceUrl skips watch pages and prefers audio-looking URL", () => {
  assert.equal(
    whisperSourceUrl({
      audioUrl: "https://www.tiktok.com/@eugenius_official/video/1",
      videoUrl: "https://v16m.tiktokcdn-us.com/a.mp3",
    }),
    "https://v16m.tiktokcdn-us.com/a.mp3",
  );
  assert.equal(
    whisperSourceUrl({
      audioUrl: "https://instagram.com/reel/abc/",
    }),
    undefined,
  );
});
