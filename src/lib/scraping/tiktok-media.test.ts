import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isHttpMediaUrl,
  isTikTokWatchPage,
  mapTikTokActorItems,
  pickTikTokMediaUrls,
  tiktokWhisperUrl,
  type TikTokActorItem,
} from "@/lib/scraping/tiktok-media";

/** Форма clockworks/tiktok-profile-scraper как у @eugenius_official 16.08.2026 */
function eugeniusLike(overrides: Partial<TikTokActorItem> = {}): TikTokActorItem {
  return {
    id: "7382983308973468934",
    text: "ЕНТ: разбор задачи за 30 секунд",
    webVideoUrl: "https://www.tiktok.com/@eugenius_official/video/7382983308973468934",
    playCount: 12_000,
    diggCount: 400,
    videoUrl: "",
    mediaUrls: [],
    videoMeta: { duration: 34 },
    musicMeta: {
      playUrl:
        "https://v16m.tiktokcdn-us.com/ec6ac77af66f4fe6c96e5a7514ace77c/audio?mime_type=audio_mpeg",
    },
    ...overrides,
  };
}

test("watch page is not a Whisper source; CDN hosts are", () => {
  assert.equal(
    isTikTokWatchPage("https://www.tiktok.com/@eugenius_official/video/1"),
    true,
  );
  assert.equal(isHttpMediaUrl("https://www.tiktok.com/@eugenius_official/video/1"), false);
  assert.equal(
    isHttpMediaUrl("https://v16m.tiktokcdn-us.com/ec6ac77/audio?mime_type=audio_mpeg"),
    true,
  );
  assert.equal(
    isHttpMediaUrl("https://v16-webapp-prime.tiktok.com/video/tos/useast2a/file.mp4"),
    true,
  );
  assert.equal(isHttpMediaUrl(""), false);
  assert.equal(isHttpMediaUrl(undefined), false);
});

test("eugenius-like actor item: empty videoUrl, playUrl → audioUrl", () => {
  const picked = pickTikTokMediaUrls(eugeniusLike());
  assert.equal(
    picked.audioUrl,
    "https://v16m.tiktokcdn-us.com/ec6ac77af66f4fe6c96e5a7514ace77c/audio?mime_type=audio_mpeg",
  );
  assert.equal(picked.videoUrl, undefined);
  assert.equal(tiktokWhisperUrl(eugeniusLike()), picked.audioUrl);
});

test("clockworks sample: mediaUrls + downloadAddr + playUrl", () => {
  const item = eugeniusLike({
    videoUrl: "",
    mediaUrls: [
      "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/occq.mp4",
    ],
    videoMeta: {
      duration: 59,
      downloadAddr: "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/occq.mp4",
      originalDownloadAddr:
        "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/orig.mp4",
    },
    musicMeta: {
      playUrl:
        "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/sound?mime_type=audio_mpeg",
    },
  });
  const picked = pickTikTokMediaUrls(item);
  assert.equal(
    picked.audioUrl,
    "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/sound?mime_type=audio_mpeg",
  );
  assert.equal(
    picked.videoUrl,
    "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/occq.mp4",
  );
});

test("Apify-hosted videoUrl wins as video file when downloads are on", () => {
  const picked = pickTikTokMediaUrls(
    eugeniusLike({
      videoUrl: "https://api.apify.com/v2/key-value-stores/abc/records/video.mp4",
      musicMeta: { playUrl: "" },
    }),
  );
  assert.equal(picked.audioUrl, undefined);
  assert.equal(
    picked.videoUrl,
    "https://api.apify.com/v2/key-value-stores/abc/records/video.mp4",
  );
  assert.equal(tiktokWhisperUrl(eugeniusLike({
    videoUrl: "https://api.apify.com/v2/key-value-stores/abc/records/video.mp4",
    musicMeta: { playUrl: "" },
  })), picked.videoUrl);
});

test("page-only item has no Whisper URL", () => {
  const picked = pickTikTokMediaUrls(
    eugeniusLike({
      videoUrl: "",
      mediaUrls: [],
      musicMeta: { playUrl: "" },
      videoMeta: { duration: 10 },
    }),
  );
  assert.equal(picked.audioUrl, undefined);
  assert.equal(picked.videoUrl, undefined);
  assert.equal(tiktokWhisperUrl({
    id: "x",
    url: "https://www.tiktok.com/@eugenius_official/video/1",
    views: 1,
  }), undefined);
});

test("mapTikTokActorItems fills audioUrl and ranks top-8 by views", () => {
  const items = [
    eugeniusLike({ id: "low", playCount: 10, text: "мало" }),
    eugeniusLike({
      id: "high",
      playCount: 99_000,
      text: "хит",
      musicMeta: { playUrl: "https://sf16.tiktokcdn-us.com/hit.mp3" },
    }),
    eugeniusLike({ id: "mid", playCount: 500, stats: { playCount: 500 } }),
  ];
  const mapped = mapTikTokActorItems(items, "eugenius_official");
  assert.equal(mapped.length, 3);
  assert.deepEqual(
    mapped.map((video) => video.id),
    ["high", "mid", "low"],
  );
  assert.equal(mapped[0].audioUrl, "https://sf16.tiktokcdn-us.com/hit.mp3");
  assert.ok(mapped.every((video) => Boolean(video.audioUrl)));
  assert.equal(
    mapped[0].url,
    "https://www.tiktok.com/@eugenius_official/video/7382983308973468934",
  );
});

test("webVideoUrl never becomes audioUrl", () => {
  const mapped = mapTikTokActorItems(
    [
      eugeniusLike({
        videoUrl: "https://www.tiktok.com/@eugenius_official/video/1",
        musicMeta: { playUrl: "" },
      }),
    ],
    "eugenius_official",
  );
  assert.equal(mapped[0].audioUrl, undefined);
  assert.equal(mapped[0].videoUrl, undefined);
  assert.match(mapped[0].url, /tiktok\.com/);
});
