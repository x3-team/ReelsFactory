import OpenAI from "openai";

import { isMockMode } from "@/lib/config";

const AITUNNEL_BASE_URL = "https://api.aitunnel.ru/v1/";

/**
 * Единый OpenAI-совместимый клиент через AITunnel (aitunnel.ru).
 * Один ключ → GPT / Claude / Whisper и другие модели.
 */
export function getAiTunnelClient() {
  const apiKey = process.env.AITUNNEL_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AITUNNEL_API_KEY (или OPENAI_API_KEY) не задан");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.AITUNNEL_BASE_URL || AITUNNEL_BASE_URL,
  });
}

export function hasAiCredentials() {
  return Boolean(process.env.AITUNNEL_API_KEY || process.env.OPENAI_API_KEY);
}

export function shouldUseMockAi() {
  return isMockMode() || !hasAiCredentials();
}

export function llmModel() {
  return (
    process.env.AITUNNEL_LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini"
  );
}

export function whisperModel() {
  return process.env.AITUNNEL_WHISPER_MODEL || "whisper-1";
}
