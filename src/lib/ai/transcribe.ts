import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { loadWhisperFile } from "@/lib/ai/whisper-media";
import { mockTranscription } from "@/lib/mocks/demo-data";

const DEFAULT_WHISPER_TIMEOUT_MS = 30_000;

function whisperTimeoutMs() {
  return Number(process.env.WHISPER_TIMEOUT_MS || DEFAULT_WHISPER_TIMEOUT_MS);
}

async function transcribeOnce(input: {
  audioUrl: string;
  hint?: string;
  signal: AbortSignal;
}): Promise<{ text: string; mocked: boolean }> {
  const openai = getAiTunnelClient();
  const file = await loadWhisperFile(input.audioUrl, { signal: input.signal });

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
