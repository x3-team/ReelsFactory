import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { mockTranscription } from "@/lib/mocks/demo-data";
import type { ScrapedVideo } from "@/lib/types";

/**
 * Политика Whisper (качество vs цена):
 * - FREE: 0 — только captions (быстрый тизер)
 * - START: топ-3 по views с audioUrl — хватает на пакет 15/30/45
 * - PRO / AGENCY: топ-5 — шире тон, хуки и «язык» автора
 *
 * Kill-switch: ENABLE_WHISPER=false полностью выключает.
 */
export function whisperSlotsForPlan(plan?: string | null): number {
  if (process.env.ENABLE_WHISPER === "false") return 0;
  const p = (plan || "FREE").toUpperCase();
  if (p === "START") return 3;
  if (p === "PRO" || p === "AGENCY") return 5;
  return 0;
}

export function isWhisperEnabled() {
  return process.env.ENABLE_WHISPER !== "false";
}

/** Быстрый текст для LLM без скачивания видео */
export function captionAsTranscript(hint?: string) {
  return mockTranscription(hint);
}

export type VideoEvidence = {
  views: number;
  durationSec?: number;
  caption: string;
  transcript: string;
  source: "whisper" | "caption";
};

/** Выбираем ролики под Whisper: есть файл + по возможности речь длиннее ~12с */
export function pickVideosForWhisper(
  videos: ScrapedVideo[],
  slots: number,
): ScrapedVideo[] {
  if (slots <= 0) return [];
  const ranked = [...videos].sort((a, b) => {
    const aAudio = a.audioUrl ? 1 : 0;
    const bAudio = b.audioUrl ? 1 : 0;
    if (aAudio !== bAudio) return bAudio - aAudio;
    const aDur = a.durationSec && a.durationSec >= 12 ? 1 : 0;
    const bDur = b.durationSec && b.durationSec >= 12 ? 1 : 0;
    if (aDur !== bDur) return bDur - aDur;
    return (b.views || 0) - (a.views || 0);
  });
  return ranked.filter((v) => v.audioUrl).slice(0, slots);
}

export async function transcribeAudio(input: {
  audioUrl: string;
  hint?: string;
  /** Явно включить Whisper (для платных слотов), игнорируя старый default off */
  useWhisper: boolean;
}): Promise<{ text: string; mocked: boolean; source: "whisper" | "caption" }> {
  if (shouldUseMockAi() || !input.useWhisper) {
    return {
      text: captionAsTranscript(input.hint),
      mocked: true,
      source: "caption",
    };
  }

  try {
    const openai = getAiTunnelClient();
    const audioRes = await fetch(input.audioUrl, {
      signal: AbortSignal.timeout(
        Number(process.env.WHISPER_DOWNLOAD_TIMEOUT_MS || 20_000),
      ),
    });
    if (!audioRes.ok) {
      throw new Error(`Не удалось скачать аудио (${audioRes.status})`);
    }

    const blob = await audioRes.blob();
    const file = new File([blob], "audio.mp3", {
      type: blob.type || "audio/mpeg",
    });

    const result = await openai.audio.transcriptions.create({
      file,
      model: whisperModel(),
      // подсказка языку — RU/СНГ продукт
      language: "ru",
    });

    const text = (result.text || "").trim();
    if (!text) {
      return {
        text: captionAsTranscript(input.hint),
        mocked: true,
        source: "caption",
      };
    }

    return { text, mocked: false, source: "whisper" };
  } catch (error) {
    console.warn(
      "Whisper/AITunnel unavailable, using caption fallback:",
      error instanceof Error ? error.message : error,
    );
    return {
      text: captionAsTranscript(input.hint),
      mocked: true,
      source: "caption",
    };
  }
}

/** Собираем evidence: Whisper на N роликах + captions на остальных из топа */
export async function buildVideoEvidence(input: {
  videos: ScrapedVideo[];
  plan?: string | null;
}): Promise<VideoEvidence[]> {
  const slots = whisperSlotsForPlan(input.plan);
  const whisperTargets = pickVideosForWhisper(input.videos, slots);
  const whisperIds = new Set(whisperTargets.map((v) => v.id));

  // В контекст — до 5 сильных роликов (views уже отсортированы снаружи)
  const contextVideos = input.videos.slice(0, Math.max(5, slots || 5));

  const evidence = await Promise.all(
    contextVideos.map(async (video) => {
      const shouldWhisper = whisperIds.has(video.id) && Boolean(video.audioUrl);
      if (shouldWhisper) {
        const { text, source } = await transcribeAudio({
          audioUrl: video.audioUrl!,
          hint: video.caption,
          useWhisper: true,
        });
        return {
          views: video.views || 0,
          durationSec: video.durationSec,
          caption: video.caption || "",
          transcript: text,
          source,
        } satisfies VideoEvidence;
      }
      return {
        views: video.views || 0,
        durationSec: video.durationSec,
        caption: video.caption || "",
        transcript: captionAsTranscript(video.caption),
        source: "caption" as const,
      };
    }),
  );

  return evidence;
}
