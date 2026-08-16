import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { mockTranscription } from "@/lib/mocks/demo-data";

function mediaDownloadHeaders(url: string): HeadersInit | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.includes("tiktok")) return undefined;
  } catch {
    return undefined;
  }
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://www.tiktok.com/",
  };
}

async function fileFromMediaBlob(blob: Blob, url: string) {
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

export async function transcribeAudio(input: {
  audioUrl: string;
  hint?: string;
}): Promise<{ text: string; mocked: boolean }> {
  if (shouldUseMockAi()) {
    return { text: mockTranscription(input.hint), mocked: true };
  }

  try {
    const openai = getAiTunnelClient();
    const audioRes = await fetch(input.audioUrl, {
      // Instagram CDN часто тормозит — не блокируем пайплайн навечно
      signal: AbortSignal.timeout(
        Number(process.env.WHISPER_DOWNLOAD_TIMEOUT_MS || 20_000),
      ),
      headers: mediaDownloadHeaders(input.audioUrl),
    });
    if (!audioRes.ok) {
      throw new Error(`Не удалось скачать аудио (${audioRes.status})`);
    }

    const blob = await audioRes.blob();
    const file = await fileFromMediaBlob(blob, input.audioUrl);

    const result = await openai.audio.transcriptions.create({
      file,
      model: whisperModel(),
    });

    return { text: result.text, mocked: false };
  } catch (error) {
    // Без реального audio URL (mock-скрапинг) не роняем пайплайн —
    // стратегия всё равно генерируется живой LLM на био + captions.
    console.warn(
      "Whisper/AITunnel unavailable, using caption fallback:",
      error instanceof Error ? error.message : error,
    );
    return { text: mockTranscription(input.hint), mocked: true };
  }
}
