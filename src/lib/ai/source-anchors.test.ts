import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DESERTMSK_LIVE_CAPTIONS,
  DESERTMSK_LIVE_PROFILE,
  DESERTMSK_LIVE_WHISPER_RAW,
  DESERTMSK_PREVIOUS_LIVE_SCRIPTS,
} from "@/lib/ai/fixtures/desertmsk-live";
import { normalizeStrategy } from "@/lib/ai/normalize-strategy";
import {
  VOICE_MISSING_TIP,
  assertStrategyAnchored,
  extractAnchorPhrases,
  isUsableVoiceText,
  scriptHasSourceAnchor,
  sourceCorpus,
  usableTranscriptions,
  withVoiceHeardTip,
} from "@/lib/ai/source-anchors";

const genericOfficeScript = {
  title: "Ролик умирает на первой фразе",
  format: "Reels 15с · ошибка",
  duration_sec: 15,
  hook_options: [
    "Хватит начинать с «привет, сегодня».",
    "Если уходят сразу — виновата первая фраза.",
    "Скажи удар. Потом уже пользу.",
  ],
  teleprompter_script:
    "0–3с: Хватит начинать с «привет, сегодня я расскажу».\n3–8с: Проблема: человек уже листнул, пока ты представляешься.\n8–12с: Демо: первая фраза — удар. Потом один факт. Без вступления.\n12–15с: Сохрани. Завтра снимешь с этой фразы.",
  caption: "Первая фраза без приветствия.",
  cta: "Сохрани ролик",
};

const anchoredZefirScript = {
  title: "Почему зефир ломается кусочками",
  format: "Reels 15с · ошибка",
  duration_sec: 15,
  hook_options: [
    "Зефир ломается кусочками? Это может быть хорошим знаком",
    "Вот как понять, что зефир уже можно отсаживать",
    "Правильный зефир не тянется бесконечной липкой лентой",
  ],
  teleprompter_script: DESERTMSK_PREVIOUS_LIVE_SCRIPTS[0].teleprompter,
  caption: "После отсаживания зефир должен отламываться кусочками.",
  cta: "Сохрани ролик",
};

test("junk Whisper is not treated as a heard voice", () => {
  const captionsAndBio = [DESERTMSK_LIVE_PROFILE.bio, ...DESERTMSK_LIVE_CAPTIONS];
  const raw = DESERTMSK_LIVE_WHISPER_RAW.map((item) => item.text);
  assert.equal(isUsableVoiceText("Thank you for watching!"), false);
  assert.equal(isUsableVoiceText("チャンネル登録をお願いいたします。"), false);
  assert.equal(
    isUsableVoiceText("200°C-392°F 10-15分", { expectCyrillic: true }),
    false,
  );
  const usable = usableTranscriptions(raw, captionsAndBio);
  assert.deepEqual(usable, []);
  const corpus = sourceCorpus({
    bio: DESERTMSK_LIVE_PROFILE.bio,
    captions: DESERTMSK_LIVE_CAPTIONS,
    transcriptions: raw,
  });
  assert.equal(corpus.voiceHeard, false);
  assert.ok(corpus.texts.some((text) => /отсажива/i.test(text)));
});

test("normalize/prompt-guard rejects a desertmsk script without transcript/caption tokens", () => {
  const corpus = sourceCorpus({
    bio: DESERTMSK_LIVE_PROFILE.bio,
    captions: DESERTMSK_LIVE_CAPTIONS,
    transcriptions: DESERTMSK_LIVE_WHISPER_RAW.map((item) => item.text),
  });
  const generic = scriptHasSourceAnchor(genericOfficeScript, corpus.texts);
  assert.equal(generic.ok, false);

  const strategy = normalizeStrategy({
    niche: "Авторские десерты на заказ",
    target_audience: "Домашние кондитеры",
    content_pillars: [{ title: "Зефир", description: "Проверка готовности" }],
    profile_audit_tips: [],
    scripts: [genericOfficeScript, genericOfficeScript, genericOfficeScript],
  });
  assert.throws(
    () => assertStrategyAnchored(strategy, corpus.texts),
    (error: Error) =>
      error.name === "SourceAnchorError" && /без якоря/i.test(error.message),
  );
});

test("desertmsk live 15s with отсаживание / кусочками passes the anchor guard", () => {
  const corpus = sourceCorpus({
    bio: DESERTMSK_LIVE_PROFILE.bio,
    captions: DESERTMSK_LIVE_CAPTIONS,
    transcriptions: [],
  });
  const hit = scriptHasSourceAnchor(anchoredZefirScript, corpus.texts);
  assert.equal(hit.ok, true);
  assert.ok(hit.hits.some((token) => /зефир|отсаж|кусок/i.test(token)));

  const phrases = extractAnchorPhrases(corpus.texts);
  assert.ok(phrases.some((item) => /клубника со сливками/i.test(item)));
});

test("empty transcriptions inject a captions-only audit tip", () => {
  const strategy = withVoiceHeardTip(
    {
      niche: "Зефир",
      target_audience: "Кондитеры",
      content_pillars: [{ title: "Зефир", description: "Готовность" }],
      profile_audit_tips: ["Цену не копируй в каждый ролик."],
      scripts: [anchoredZefirScript],
    },
    false,
  );
  assert.equal(strategy.profile_audit_tips[0], VOICE_MISSING_TIP);
});
