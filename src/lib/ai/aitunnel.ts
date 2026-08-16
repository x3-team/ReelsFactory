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
 * Базовая модель Free/Start: gpt-5.6-luna (~20/120 ₽ за 1M).
 * Не ставим nano / haiku / flash-lite — ломают JSON-сценарии.
 */
export function llmModel() {
  return (
    process.env.AITUNNEL_LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-5.6-luna"
  );
}

/**
 * Pro/Agency: сильнее креатив без «reasoning tax».
 * gpt-5.6-terra ≈ 20/1200 ₽ за 1M — заметно лучше flash, всё ещё дёшево vs gpt-4o/sol.
 * (deepseek-v4-pro тратит max_tokens на reasoning и иногда отдаёт пустой content)
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
