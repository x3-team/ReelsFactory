import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { mockTranscription } from "@/lib/mocks/demo-data";

const DEFAULT_WHISPER_TIMEOUT_MS = 30_000;
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

function mediaDownloadHeaders(url: string): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  };
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("tiktok")) {
      headers.Referer = "https://www.tiktok.com/";
    } else if (
      host.includes("instagram") ||
      host.includes("cdninstagram") ||
      host.includes("fbcdn")
    ) {
      headers.Referer = "https://www.instagram.com/";
    }
  } catch {
    // keep default UA
  }
  return headers;
}

function whisperTimeoutMs() {
  return Number(process.env.WHISPER_TIMEOUT_MS || DEFAULT_WHISPER_TIMEOUT_MS);
}

async function fileFromMediaBlob(blob: Blob, url: string) {
  if (blob.size > MAX_MEDIA_BYTES) {
    throw new Error(`Медиа слишком большое для Whisper (${blob.size} bytes)`);
  }
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const type = (blob.type || "").toLowerCase();
  const looksMpeg =
    isId3 ||
    type.includes("mpeg") ||
    type.includes("mp3") ||
    url.includes("audio_mpeg") ||
    /\.mp3(\?|$)/i.test(url);
  const looksMp4 =
    type.includes("mp4") ||
    url.includes("video_mp4") ||
    /\.mp4(\?|$)/i.test(url);
  if (looksMpeg) {
    return new File([buf], "audio.mp3", { type: "audio/mpeg" });
  }
  if (looksMp4) {
    return new File([buf], "video.mp4", { type: type || "video/mp4" });
  }
  return new File([buf], "audio.mp3", { type: type || "audio/mpeg" });
}

async function transcribeOnce(input: {
  audioUrl: string;
  hint?: string;
  signal: AbortSignal;
}): Promise<{ text: string; mocked: boolean }> {
  const openai = getAiTunnelClient();
  const audioRes = await fetch(input.audioUrl, {
    signal: input.signal,
    headers: mediaDownloadHeaders(input.audioUrl),
  });
  if (!audioRes.ok) {
    throw new Error(`Не удалось скачать аудио (${audioRes.status})`);
  }

  const blob = await audioRes.blob();
  const file = await fileFromMediaBlob(blob, input.audioUrl);

  const result = await openai.audio.transcriptions.create(
    {
      file,
      model: whisperModel(),
    },
    { signal: input.signal, timeout: whisperTimeoutMs() },
  );

  return { text: result.text, mocked: false };
}

export function fallbackTranscription(hint?: string): { text: string; mocked: boolean } {
  if (shouldUseMockAi()) {
    return { text: mockTranscription(hint), mocked: true };
  }
  return { text: "", mocked: true };
}

export async function transcribeAudio(input: {
  audioUrl: string;
  hint?: string;
}): Promise<{ text: string; mocked: boolean }> {
  if (shouldUseMockAi()) {
    return fallbackTranscription(input.hint);
  }

  try {
    const signal = AbortSignal.timeout(whisperTimeoutMs());
    return await transcribeOnce({ ...input, signal });
  } catch (error) {
    // Без реального audio URL / при таймауте CDN не роняем пайплайн —
    // стратегия всё равно генерируется живой LLM на био + captions.
    // В live НЕ подмешиваем mock-суфлёр: иначе «ролик умирает» попадает в якоря.
    console.warn(
      "Whisper/AITunnel unavailable, using caption fallback:",
      error instanceof Error ? error.message : error,
    );
    return fallbackTranscription(input.hint);
  }
}
