import OpenAI from "openai";

import { isMockMode } from "@/lib/config";

const AITUNNEL_BASE_URL = "https://api.aitunnel.ru/v1/";

/**
 * Единый OpenAI-совместимый клиент через AITunnel (aitunnel.ru).
 * Один ключ → GPT / Claude / Whisper / DeepSeek и др.
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

/**
 * Базовая модель (Free/Start): приоритет живости/пользы, затем цена.
 * gemini-3.5-flash-lite — самые живые хуки + конкретная польза при ~0.3–0.4₽/стратегию.
 */
export function llmModel() {
  return (
    process.env.AITUNNEL_LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    "gemini-3.5-flash-lite"
  );
}

/**
 * Pro/Agency: максимум пользы и структуры в сценариях.
 * gpt-5.6-terra ≈ 1₽/стратегию — всё ещё копейки vs Whisper/тариф.
 */
export function llmModelPro() {
  return process.env.AITUNNEL_LLM_MODEL_PRO || "gpt-5.6-terra";
}

export function llmModelForPlan(plan?: string | null) {
  const normalized = (plan || "").toUpperCase();
  if (normalized === "PRO" || normalized === "AGENCY") {
    return llmModelPro();
  }
  return llmModel();
}

export function whisperModel() {
  return process.env.AITUNNEL_WHISPER_MODEL || "whisper-1";
}
