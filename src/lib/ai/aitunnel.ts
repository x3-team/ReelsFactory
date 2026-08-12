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
 * Базовая модель: лучший баланс цена/качество для JSON-сценариев.
 * deepseek-v4-flash ≈ 18/36 ₽ за 1M (AITunnel) — сильно дешевле gpt-4o при хорошей структуре.
 */
export function llmModel() {
  return (
    process.env.AITUNNEL_LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    "deepseek-v4-flash"
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

/**
 * Strategy / analysis JSON — всегда Flash (COGS).
 * Pro-креатив дорогой на output; жирный strategy-JSON на Terra съедает маржу.
 */
export function llmModelForStrategy(plan?: string | null) {
  void plan;
  return llmModel();
}

/**
 * Studio (remake / autopsy) — Terra на Pro/Agency, иначе Flash.
 */
export function llmModelForStudio(plan?: string | null) {
  return llmModelForPlan(plan);
}

/** @deprecated prefer llmModelForStrategy / llmModelForStudio */
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
