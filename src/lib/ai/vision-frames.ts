import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  getAiTunnelClient,
  shouldUseMockAi,
  visionModel,
} from "@/lib/ai/aitunnel";
import { recordCostEvent } from "@/lib/cost-meter";
import {
  VISION_FRAMES_PER_VIDEO,
  VISION_MAX_VIDEOS,
} from "@/lib/content/scrape-limits";
import type { VisualNote } from "@/lib/content/profile-insights";
import { prisma } from "@/lib/prisma";
import type { ScrapedVideo } from "@/lib/types";

const execFileAsync = promisify(execFile);

const VISION_PROMPT = `Разбери кадры короткого ролика (Reels / TikTok / Shorts).
Верни ТОЛЬКО JSON:
{
  "on_screen_text": ["текст с экрана, как написано, без догадок"],
  "product": "что за продукт, блюдо или услуга в кадре — коротко",
  "process": "что делают руками / какой процесс",
  "talking_head": false,
  "shot_ideas": ["что видно в кадре 1", "что видно в кадре 2"]
}
Пиши по-русски. Не выдумывай ингредиенты, которых нет на кадре и в подписи.
Если текст нечитаем — пустой массив. talking_head = true только если лицо говорит в камеру.`;

export function parseVisionPayload(raw: unknown, videoId: string): VisualNote {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const texts = Array.isArray(obj.on_screen_text)
    ? obj.on_screen_text
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.replace(/\s+/g, " ").trim())
        .filter((t) => t.length >= 2)
        .slice(0, 8)
    : [];
  const shots = Array.isArray(obj.shot_ideas)
    ? obj.shot_ideas
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.replace(/\s+/g, " ").trim())
        .filter((t) => t.length >= 4)
        .slice(0, 6)
    : [];
  return {
    videoId,
    onScreenText: texts,
    product: typeof obj.product === "string" ? obj.product.replace(/\s+/g, " ").trim() : "",
    process: typeof obj.process === "string" ? obj.process.replace(/\s+/g, " ").trim() : "",
    talkingHead: obj.talking_head === true,
    shotIdeas: shots,
  };
}

export function formatVisualLine(note: VisualNote): string {
  const ocr = note.onScreenText.slice(0, 3).join("; ");
  const bits = [
    note.product && `продукт: ${note.product}`,
    note.process && `процесс: ${note.process}`,
    ocr && `OCR: ${ocr}`,
  ].filter(Boolean);
  return `[кадр ${note.videoId}] ${bits.join(" · ") || "кадр без текста"}`;
}

function visionDisabled() {
  return /^(1|true|yes)$/i.test(process.env.VISION_DISABLED || "");
}

async function readCache(videoKey: string): Promise<VisualNote | null> {
  if (!videoKey) return null;
  try {
    const hit = await prisma.whisperCache.findUnique({ where: { videoKey } });
    if (!hit?.text || hit.source !== "vision") return null;
    return parseVisionPayload(JSON.parse(hit.text), videoKey.replace(/^vision:v1:[^:]+:/, ""));
  } catch {
    return null;
  }
}

async function writeCache(videoKey: string, note: VisualNote) {
  if (!videoKey) return;
  try {
    await prisma.whisperCache.upsert({
      where: { videoKey },
      create: {
        videoKey,
        text: JSON.stringify(note),
        source: "vision",
      },
      update: { text: JSON.stringify(note), source: "vision" },
    });
  } catch (error) {
    console.warn(
      "vision cache skipped",
      error instanceof Error ? error.message : error,
    );
  }
}

async function probeDurationSec(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        filePath,
      ],
      { timeout: 12_000 },
    );
    const n = Number.parseFloat(stdout.trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function frameTimestamps(durationSec: number): number[] {
  const count = Math.max(1, VISION_FRAMES_PER_VIDEO);
  if (!durationSec || durationSec < 1.5) return [0.2];
  if (count === 1) return [Math.min(1, durationSec * 0.3)];
  const early = Math.max(0.3, durationSec * 0.18);
  const mid = Math.max(early + 0.6, durationSec * 0.55);
  return [early, Math.min(mid, Math.max(0.4, durationSec - 0.3))].slice(0, count);
}

async function extractJpegFrames(videoPath: string): Promise<Buffer[]> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rf-frames-"));
  const frames: Buffer[] = [];
  try {
    const duration = await probeDurationSec(videoPath);
    const stamps = frameTimestamps(duration);
    for (let i = 0; i < stamps.length; i++) {
      const t = stamps[i];
      const out = path.join(dir, `f${i}.jpg`);
      try {
        await execFileAsync(
          "ffmpeg",
          [
            "-y",
            "-ss",
            t.toFixed(2),
            "-i",
            videoPath,
            "-frames:v",
            "1",
            "-vf",
            "scale=768:-2",
            "-q:v",
            "5",
            out,
          ],
          { timeout: 20_000 },
        );
        const buf = await fs.readFile(out);
        if (buf.length > 800) frames.push(buf);
      } catch (error) {
        console.warn(
          "ffmpeg frame skipped",
          error instanceof Error ? error.message : error,
        );
      }
    }
    return frames;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function downloadVideo(url: string, dest: string) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(
      Number(process.env.VISION_DOWNLOAD_TIMEOUT_MS || 20_000),
    ),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ReelsFactory/0.1; +https://reelsfactory.app)",
    },
  });
  if (!res.ok) throw new Error(`Не удалось скачать видео (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const max = Number(process.env.VISION_MAX_BYTES || 25_000_000);
  if (buf.length > max) throw new Error("видео слишком большое для OCR");
  await fs.writeFile(dest, buf);
}

async function readFramesWithVision(
  frames: Buffer[],
  caption: string,
): Promise<unknown> {
  const openai = getAiTunnelClient();
  const images = frames.slice(0, VISION_FRAMES_PER_VIDEO).map((buf) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/jpeg;base64,${buf.toString("base64")}`,
    },
  }));
  const completion = await openai.chat.completions.create(
    {
      model: visionModel(),
      response_format: { type: "json_object" },
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${VISION_PROMPT}\n\nПодпись ролика (не выдумывай сверх неё и кадра): ${caption || "—"}`,
            },
            ...images,
          ],
        },
      ],
      temperature: 0.2,
    },
    { timeout: 60_000, maxRetries: 0 },
  );
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("пустой ответ vision");
  return JSON.parse(content) as unknown;
}

async function inspectVideo(input: {
  video: ScrapedVideo;
  cacheKey: string;
  userId?: string;
}): Promise<VisualNote | null> {
  const cached = await readCache(input.cacheKey);
  if (cached) {
    return { ...cached, videoId: input.video.id };
  }

  const url = input.video.audioUrl;
  if (!url) return null;

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rf-vid-"));
  const filePath = path.join(tmp, "clip.mp4");
  try {
    await downloadVideo(url, filePath);
    const frames = await extractJpegFrames(filePath);
    if (!frames.length) return null;
    const payload = await readFramesWithVision(frames, input.video.caption || "");
    const note = parseVisionPayload(payload, input.video.id);
    await writeCache(input.cacheKey, note);
    await recordCostEvent("vision", input.userId, input.cacheKey);
    return note;
  } catch (error) {
    console.warn(
      "vision frame inspect failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function hasFfmpeg() {
  try {
    await execFileAsync("ffmpeg", ["-version"], { timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * For silent / music process reels: sample 2 frames from up to 2 top videos
 * and read on-screen text + what's in frame. Skip if Whisper already heard speech.
 */
export async function inspectSilentVideos(input: {
  videos: ScrapedVideo[];
  cachePrefix: string;
  userId?: string;
}): Promise<VisualNote[]> {
  if (shouldUseMockAi() || visionDisabled()) return [];
  const cap = Math.max(0, VISION_MAX_VIDEOS);
  if (!cap) return [];
  if (!(await hasFfmpeg())) {
    console.warn("ffmpeg не найден — OCR кадров пропущен");
    return [];
  }

  const notes: VisualNote[] = [];
  for (const video of input.videos) {
    if (notes.length >= cap) break;
    if (!video.audioUrl) continue;
    const note = await inspectVideo({
      video,
      cacheKey: `vision:v1:${input.cachePrefix}:${video.id}`,
      userId: input.userId,
    });
    if (note && (note.product || note.process || note.onScreenText.length)) {
      notes.push(note);
    }
  }
  return notes;
}
