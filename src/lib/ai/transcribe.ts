import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { mockTranscription } from "@/lib/mocks/demo-data";

function whisperEnabled() {
  // По умолчанию выкл: captions хватает для стратегии, Whisper = +30–90 сек и ~1.5₽
  return process.env.ENABLE_WHISPER === "true";
}

export function isWhisperEnabled() {
  return whisperEnabled();
}

/** Быстрый текст для LLM без скачивания видео */
export function captionAsTranscript(hint?: string) {
  return mockTranscription(hint);
}

export async function transcribeAudio(input: {
  audioUrl: string;
  hint?: string;
}): Promise<{ text: string; mocked: boolean }> {
  if (shouldUseMockAi() || !whisperEnabled()) {
    return { text: captionAsTranscript(input.hint), mocked: true };
  }

  try {
    const openai = getAiTunnelClient();
    const audioRes = await fetch(input.audioUrl, {
      signal: AbortSignal.timeout(
        Number(process.env.WHISPER_DOWNLOAD_TIMEOUT_MS || 12_000),
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
    });

    return { text: result.text, mocked: false };
  } catch (error) {
    console.warn(
      "Whisper/AITunnel unavailable, using caption fallback:",
      error instanceof Error ? error.message : error,
    );
    return { text: captionAsTranscript(input.hint), mocked: true };
  }
}
