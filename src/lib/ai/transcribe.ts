import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { recordCostEvent } from "@/lib/cost-meter";
import { mockTranscription } from "@/lib/mocks/demo-data";
import { prisma } from "@/lib/prisma";

export async function transcribeAudio(input: {
  audioUrl: string;
  hint?: string;
  cacheKey?: string;
  userId?: string;
}): Promise<{ text: string; mocked: boolean; cached?: boolean }> {
  const videoKey = input.cacheKey || input.audioUrl;

  if (videoKey) {
    const hit = await prisma.whisperCache.findUnique({
      where: { videoKey },
    });
    if (hit?.text) {
      return { text: hit.text, mocked: hit.source !== "whisper", cached: true };
    }
  }

  if (shouldUseMockAi()) {
    const text = mockTranscription(input.hint);
    return { text, mocked: true };
  }

  if (!input.audioUrl) {
    return { text: "", mocked: true };
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
    });

    await upsertWhisper(videoKey, result.text, "whisper");
    await recordCostEvent("whisper", input.userId, videoKey);
    return { text: result.text, mocked: false };
  } catch (error) {
    console.warn(
      "Whisper/AITunnel unavailable, using caption fallback:",
      error instanceof Error ? error.message : error,
    );
    // Empty — never inject demo "хуки/удержание" speech into a real niche.
    return { text: "", mocked: true };
  }
}

async function upsertWhisper(videoKey: string, text: string, source: string) {
  if (!videoKey || !text) return;
  await prisma.whisperCache.upsert({
    where: { videoKey },
    create: { videoKey, text, source },
    update: { text, source },
  });
}
