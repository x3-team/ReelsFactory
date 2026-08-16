import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assembleTeleprompter,
  ensureTeleprompter,
  extractChatContent,
  isUsableTeleprompter,
  normalizeStrategy,
  parseStrategyJson,
} from "@/lib/ai/normalize-strategy";
import { mockStrategy } from "@/lib/mocks/demo-data";

test("empty teleprompter is assembled with hook → problem → demo → CTA", () => {
  const text = ensureTeleprompter("", 15, {
    hook: "Хватит винить алгоритм.",
    title: "Хуки",
    cta: "Комментируйте ХУК",
  });
  assert.equal(isUsableTeleprompter(text, 15), true);
  assert.match(text, /0–3с: Хватит винить алгоритм/);
  assert.match(text, /Проблема/);
  assert.match(text, /Демо/);
  assert.match(text, /Комментируйте ХУК/);
});

test("array teleprompter is joined, not dropped", () => {
  const text = ensureTeleprompter(
    ["0–3с: Хук без приветствия.", "3–12с: Покажите ошибку.", "12–15с: CTA в комментарии."],
    15,
    { title: "Хук" },
  );
  assert.equal(isUsableTeleprompter(text, 15), true);
  assert.match(text, /0–3с/);
});

test("LLM JSON with empty scripts still yields 15/30/45 and a teleprompter", () => {
  const raw = parseStrategyJson(`\`\`\`json
{
  "niche": "Зефир на заказ",
  "target_audience": "Домашние кондитеры",
  "content_pillars": [{"title": "Температура", "description": "Не перегревать"}],
  "profile_audit_tips": [],
  "scripts": []
}
\`\`\``);
  const strategy = normalizeStrategy(raw);
  assert.equal(strategy.scripts.length, 3);
  assert.deepEqual(
    strategy.scripts.map((s) => s.duration_sec),
    [15, 30, 45],
  );
  for (const script of strategy.scripts) {
    assert.equal(isUsableTeleprompter(script.teleprompter_script, script.duration_sec || 30), true);
    assert.ok(script.teleprompter_script.trim().length > 0);
  }
});

test("cut-off teleprompter is replaced instead of saved empty", () => {
  const text = ensureTeleprompter("0–3с: хук\n3–", 30, {
    hook: "Одна ошибка в кадре.",
  });
  assert.equal(isUsableTeleprompter(text, 30), true);
  assert.doesNotMatch(text, /^0–3с: хук\n3–$/);
});

test("extractChatContent reads string or array parts", () => {
  assert.equal(
    extractChatContent({
      choices: [{ finish_reason: "stop", message: { content: "  {\"ok\":true}  " } }],
    }).text,
    '{"ok":true}',
  );
  assert.equal(
    extractChatContent({
      choices: [
        {
          finish_reason: "stop",
          message: { content: [{ text: "hello" }, { text: " world" }] },
        },
      ],
    }).text,
    "hello\nworld",
  );
  assert.equal(
    extractChatContent({
      choices: [{ finish_reason: "length", message: { content: null } }],
    }).text,
    "",
  );
});

test("mock strategy stays recordable after normalize", () => {
  const strategy = normalizeStrategy(
    mockStrategy({ handle: "desertmsk", goal: "GROW_AUDIENCE", tone: "EXPERT" }),
  );
  assert.equal(strategy.scripts.length, 3);
  for (const script of strategy.scripts) {
    assert.ok(script.teleprompter_script.includes("0–3с"));
  }
});

test("assembleTeleprompter always has a clock for 45s", () => {
  const text = assembleTeleprompter({ durationSec: 45, hook: "Смотрите сюда." });
  assert.equal(isUsableTeleprompter(text, 45), true);
  assert.match(text, /45с/);
});
