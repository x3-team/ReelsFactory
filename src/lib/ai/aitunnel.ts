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
 * Free / Start (590₽): `gpt-5.6-luna` ≈ 20/120 ₽ за 1M (AITunnel).
 * Надёжный JSON/RU для ниши и столпов, без «пустого ChatGPT».
 * Whisper (~1.5₽/анализ) уже съедает почти весь AI-COGS — Luna не ломает маржу.
 * Не ставить sonnet/opus на каждый ролик: при росте объёма Start уйдёт в минус.
 * Override: AITUNNEL_LLM_MODEL / OPENAI_MODEL.
 */
export function llmModel() {
  return (
    process.env.AITUNNEL_LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-5.6-luna"
  );
}

/**
 * Pro (1990₽) / Agency: `gpt-5.6-terra` ≈ 20/1200 ₽ за 1M.
 * Лучше длинные сценарии и студия; всё ещё далеко от gpt-4o / sol / opus.
 * Override: AITUNNEL_LLM_MODEL_PRO.
 */
export function llmModelPro() {
  return process.env.AITUNNEL_LLM_MODEL_PRO || "gpt-5.6-terra";
}

/**
 * Strategy / analysis JSON — всегда Luna (COGS), даже на Pro.
 * Жирный strategy-JSON на Terra или sonnet съедает маржу; суфлёр собирает сервер.
 */
export function llmModelForStrategy(plan?: string | null) {
  void plan;
  return llmModel();
}

/**
 * Studio (remake / autopsy) — Terra на Pro/Agency, иначе Luna.
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

/** OCR / frame read for silent process reels. Cheap vision via AITunnel. */
export function visionModel() {
  return process.env.AITUNNEL_VISION_MODEL || "gpt-4o-mini";
}
