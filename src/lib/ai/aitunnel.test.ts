import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  LLM_MODEL_FREE,
  LLM_MODEL_PRO,
  isBannedLlmModel,
  llmModel,
  llmModelForPlan,
  llmModelPro,
} from "@/lib/ai/aitunnel";

const ENV_KEYS = [
  "AITUNNEL_LLM_MODEL",
  "OPENAI_MODEL",
  "AITUNNEL_LLM_MODEL_PRO",
] as const;

const snapshot: Record<string, string | undefined> = {};

function stashEnv() {
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

test("defaults: Free/Start = luna, Pro/Agency = terra", () => {
  stashEnv();
  assert.equal(LLM_MODEL_FREE, "gpt-5.6-luna");
  assert.equal(LLM_MODEL_PRO, "gpt-5.6-terra");
  assert.equal(llmModel(), "gpt-5.6-luna");
  assert.equal(llmModelPro(), "gpt-5.6-terra");
  assert.equal(llmModelForPlan("FREE"), "gpt-5.6-luna");
  assert.equal(llmModelForPlan("START"), "gpt-5.6-luna");
  assert.equal(llmModelForPlan(null), "gpt-5.6-luna");
  assert.equal(llmModelForPlan("PRO"), "gpt-5.6-terra");
  assert.equal(llmModelForPlan("AGENCY"), "gpt-5.6-terra");
  assert.equal(llmModelForPlan("pro"), "gpt-5.6-terra");
});

test("deepseek-v4-flash env cannot win on Free/Start", () => {
  stashEnv();
  process.env.AITUNNEL_LLM_MODEL = "deepseek-v4-flash";
  process.env.OPENAI_MODEL = "deepseek-v4-flash";
  assert.equal(isBannedLlmModel("deepseek-v4-flash"), true);
  assert.equal(llmModel(), "gpt-5.6-luna");
  assert.equal(llmModelForPlan("FREE"), "gpt-5.6-luna");
  assert.equal(llmModelForPlan("START"), "gpt-5.6-luna");
  assert.notEqual(llmModelForPlan("FREE"), "deepseek-v4-flash");
});

test("Gemini / haiku / flash-lite overrides are rejected", () => {
  stashEnv();
  process.env.AITUNNEL_LLM_MODEL = "gemini-2.5-flash";
  assert.equal(llmModelForPlan("FREE"), "gpt-5.6-luna");
  process.env.AITUNNEL_LLM_MODEL_PRO = "claude-haiku";
  assert.equal(llmModelForPlan("PRO"), "gpt-5.6-terra");
  process.env.AITUNNEL_LLM_MODEL_PRO = "gpt-4.1-nano";
  assert.equal(llmModelForPlan("AGENCY"), "gpt-5.6-terra");
});
