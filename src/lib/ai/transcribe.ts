import { shouldUseMockAi, getAiTunnelClient, whisperModel } from "@/lib/ai/aitunnel";
import { mockTranscription } from "@/lib/mocks/demo-data";

export async function transcribeAudio(input: {
  audioUrl: string;
  hint?: string;
}): Promise<{ text: string; mocked: boolean }> {
  if (shouldUseMockAi()) {
    return { text: mockTranscription(input.hint), mocked: true };
  }

  const openai = getAiTunnelClient();
  const audioRes = await fetch(input.audioUrl);
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
}
