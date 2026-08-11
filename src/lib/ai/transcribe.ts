import OpenAI from "openai";

import { isMockMode } from "@/lib/config";
import { mockTranscription } from "@/lib/mocks/demo-data";

export async function transcribeAudio(input: {
  audioUrl: string;
  hint?: string;
}): Promise<{ text: string; mocked: boolean }> {
  if (isMockMode() || !process.env.OPENAI_API_KEY) {
    return { text: mockTranscription(input.hint), mocked: true };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const audioRes = await fetch(input.audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to download audio (${audioRes.status})`);
  }

  const blob = await audioRes.blob();
  const file = new File([blob], "audio.mp3", {
    type: blob.type || "audio/mpeg",
  });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  return { text: result.text, mocked: false };
}
