import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { mockTranscription } from "@/lib/mocks/demo-data";

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
    // Без реального audio URL (mock-скрапинг) не роняем пайплайн —
    // стратегия всё равно генерируется живой LLM на био + captions.
    console.warn(
      "Whisper/AITunnel unavailable, using caption fallback:",
      error instanceof Error ? error.message : error,
    );
    return { text: mockTranscription(input.hint), mocked: true };
  }
}
