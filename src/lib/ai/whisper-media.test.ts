import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_WHISPER_BYTES,
  decideWhisperMedia,
  fileFromWhisperBytes,
  loadWhisperFile,
  pickWhisperUrlForVideo,
  selectWhisperSources,
  type WhisperProbeFn,
} from "@/lib/ai/whisper-media";

const MB = 1024 * 1024;

test("decideWhisperMedia skips 21/25/92MB blobs under the 20MB cap", () => {
  assert.equal(MAX_WHISPER_BYTES, 20 * MB);
  for (const bytes of [21 * MB, 25 * MB, 92 * MB]) {
    const decision = decideWhisperMedia({
      url: "https://scontent.cdninstagram.com/v/t50/reel.mp4",
      contentType: "video/mp4",
      contentLength: bytes,
    });
    assert.equal(decision.accept, false);
    assert.equal(decision.reason, "oversized");
    assert.equal(decision.bytes, bytes);
  }
  const small = decideWhisperMedia({
    url: "https://scontent.cdninstagram.com/v/t50/reel.mp4",
    contentType: "video/mp4",
    contentLength: 5 * MB,
  });
  assert.equal(small.accept, true);
  assert.equal(small.kind, "video");
});

test("decideWhisperMedia rejects HTML and does not treat it as mp3", () => {
  const html = new TextEncoder().encode("<!DOCTYPE html><html><body>watch</body></html>");
  const decision = decideWhisperMedia({
    url: "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/play",
    contentType: "text/html",
    contentLength: html.length,
    headBytes: html,
  });
  assert.equal(decision.accept, false);
  assert.ok(decision.reason === "html" || decision.reason === "wrong-format");
  assert.throws(
    () => fileFromWhisperBytes(html, "https://v16m.tiktokcdn-us.com/play", "text/html"),
    /формат/i,
  );
});

test("pickWhisperUrlForVideo prefers smaller audio over a huge video", async () => {
  const probe: WhisperProbeFn = async (url) => {
    if (url.includes("huge")) {
      return { accept: false, reason: "oversized", bytes: 92 * MB };
    }
    return { accept: true, kind: "audio", bytes: 400_000, contentType: "audio/mpeg" };
  };
  const url = await pickWhisperUrlForVideo(
    {
      audioUrl: "https://v16m.tiktokcdn-us.com/audio?mime_type=audio_mpeg",
      videoUrl: "https://v16-webapp-prime.tiktok.com/video/tos/huge.mp4",
    },
    probe,
  );
  assert.equal(url, "https://v16m.tiktokcdn-us.com/audio?mime_type=audio_mpeg");
});

test("selectWhisperSources skips oversized top-3 and takes the next whisperable slot", async () => {
  const probe: WhisperProbeFn = async (url) => {
    if (/21mb|92mb|25mb/.test(url)) {
      return { accept: false, reason: "oversized", bytes: 21 * MB };
    }
    if (url.includes("html")) {
      return { accept: false, reason: "html" };
    }
    return { accept: true, kind: "audio", bytes: 800_000, contentType: "audio/mpeg" };
  };

  const videos = [
    { id: "bonya-1", audioUrl: "https://scontent.cdninstagram.com/v/t50/21mb.mp4" },
    { id: "bonya-2", audioUrl: "https://scontent.cdninstagram.com/v/t50/92mb.mp4" },
    { id: "bonya-3", audioUrl: "https://scontent.cdninstagram.com/v/t50/25mb.mp4" },
    { id: "bonya-4", audioUrl: "https://scontent.cdninstagram.com/v/t50/ok.mp4" },
    { id: "bonya-5", audioUrl: "https://scontent.cdninstagram.com/v/t50/ok2.mp4" },
  ];
  const picked = await selectWhisperSources(videos, { probe });
  assert.deepEqual(
    picked.map((item) => item.video.id),
    ["bonya-4", "bonya-5"],
  );
  assert.ok(picked.every((item) => !/21mb|92mb|25mb/.test(item.url)));
});

test("TikTok playUrl that is HTML does not occupy a Whisper slot", async () => {
  const probe: WhisperProbeFn = async (url) => {
    if (url.includes("play-html")) {
      return { accept: false, reason: "html" };
    }
    if (url.includes("bad-container")) {
      return { accept: false, reason: "wrong-format" };
    }
    return { accept: true, kind: "audio", bytes: 350_000, contentType: "audio/mpeg" };
  };
  const videos = [
    {
      id: "krava-1",
      audioUrl: "https://v16-webapp-prime.tiktok.com/play-html",
      videoUrl: "https://v16-webapp-prime.tiktok.com/video/tos/bad-container.mp4",
    },
    {
      id: "krava-2",
      audioUrl: "https://v16m.tiktokcdn-us.com/ok?mime_type=audio_mpeg",
    },
    {
      id: "botagoz-3",
      audioUrl: "https://v16m.tiktokcdn-us.com/ok2?mime_type=audio_mpeg",
    },
  ];
  const picked = await selectWhisperSources(videos, { probe });
  assert.deepEqual(
    picked.map((item) => item.video.id),
    ["krava-2", "botagoz-3"],
  );
});

test("loadWhisperFile never reads a 21MB body and never builds a Whisper file", async () => {
  const fetchMock = (async () =>
    new Response(null, {
      status: 200,
      headers: {
        "content-type": "video/mp4",
        "content-length": String(21 * MB),
      },
    })) as typeof fetch;

  await assert.rejects(
    () => loadWhisperFile("https://scontent.cdninstagram.com/v/t50/21mb.mp4", { fetch: fetchMock }),
    /слишком большое/i,
  );
});

test("loadWhisperFile rejects HTML playUrl before a Whisper POST", async () => {
  const html = "<!DOCTYPE html><html><body>not audio</body></html>";
  const fetchMock = (async () =>
    new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-length": String(html.length),
      },
    })) as typeof fetch;

  await assert.rejects(
    () =>
      loadWhisperFile("https://v16-webapp-prime.tiktok.com/video/tos/play", {
        fetch: fetchMock,
      }),
    /формат|html/i,
  );
});
