import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DESERTMSK_LIVE_CAPTIONS,
  DESERTMSK_LIVE_PROFILE,
  DESERTMSK_LIVE_WHISPER_RAW,
  DESERTMSK_PREVIOUS_LIVE_SCRIPTS,
} from "@/lib/ai/fixtures/desertmsk-live";
import {
  DARIA_BIO,
  DARIA_CAPTION,
  DARIA_CAPTIONS,
  DARIA_WHISPER_RAW,
  EUGENIUS_BIO,
  EUGENIUS_CAPTIONS,
  EUGENIUS_MOCK_FALLBACK,
  KSENIA_BIO,
  KSENIA_CAPTIONS,
  KSENIA_WHISPER_RAW,
  PRODASHA_BIO,
  PRODASHA_CAPTIONS,
  PRODASHA_SONG,
} from "@/lib/ai/fixtures/cis-corpus-live";
import { normalizeStrategy } from "@/lib/ai/normalize-strategy";
import {
  VOICE_MISSING_TIP,
  WEAK_SOURCE_TIP,
  assertStrategyAnchored,
  captionSourceStrength,
  extractAnchorPhrases,
  isUsableVoiceText,
  scriptHasSourceAnchor,
  shouldPauseForFacts,
  sourceCorpus,
  usableTranscriptions,
  withSourceHonestyTips,
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
  assert.ok(phrases.some((item) => /маршмеллоу|пружин|отсаж|кусок/i.test(item)));
});

test("two scripts about the same bento caption fail distinct-anchor guard", () => {
  const corpus = sourceCorpus({
    bio: DESERTMSK_LIVE_PROFILE.bio,
    captions: DESERTMSK_LIVE_CAPTIONS,
    transcriptions: [],
  });
  const bento = {
    title: "Сборка бенто из птичьего молока",
    format: "Reels 30с · процесс",
    duration_sec: 30,
    hook_options: ["Бенто из птичьего молока без сливочного масла"],
    teleprompter_script:
      "0–3с: Бенто «Клубника со сливками» без сливочного масла.\n3–16с: Птичье молоко, клубничный слой, не торопись.\n16–24с: Сахар и жиры уменьшены.\n24–30с: Сохрани сборку.",
    caption: "Бенто из птичьего молока без сливочного масла.",
    cta: "Сохрани",
  };
  const strategy = normalizeStrategy({
    niche: "Десерты",
    target_audience: "Кондитеры",
    content_pillars: [{ title: "Бенто", description: "Сборка" }],
    profile_audit_tips: [],
    scripts: [anchoredZefirScript, bento, { ...bento, title: "Миф про тот же бенто" }],
  });
  assert.throws(
    () => assertStrategyAnchored(strategy, corpus.texts),
    (error: Error) =>
      error.name === "SourceAnchorError" && /повторяют один продукт/i.test(error.message),
  );
});

test("invented syrup/agar fails when captions never mention them", () => {
  const corpus = sourceCorpus({
    bio: DESERTMSK_LIVE_PROFILE.bio,
    captions: DESERTMSK_LIVE_CAPTIONS,
    transcriptions: [],
  });
  const syrupMyth = {
    title: "Миф о маршмеллоу без белка",
    format: "Reels 45с · миф",
    duration_sec: 45,
    hook_options: ["Маршмеллоу без белка не будет пышным? Будет."],
    teleprompter_script: DESERTMSK_PREVIOUS_LIVE_SCRIPTS[2].teleprompter,
    caption: "Маршмеллоу пружинки без белка.",
    cta: "Сохрани",
  };
  const strategy = normalizeStrategy({
    niche: "Десерты",
    target_audience: "Кондитеры",
    content_pillars: [{ title: "Маршмеллоу", description: "Без белка" }],
    profile_audit_tips: [],
    scripts: [
      anchoredZefirScript,
      {
        title: "Плитка из карамельного шоколада с миндалем",
        format: "Reels 30с · процесс",
        duration_sec: 30,
        hook_options: ["Карамельный шоколад с миндалем"],
        teleprompter_script:
          "0–3с: Делаем плитку из карамельного шоколада с миндалем.\n3–16с: Миндаль сухой, шоколад карамельный.\n16–24с: Не перегружай форму.\n24–30с: Сохрани.",
        caption: "Плитка из карамельного шоколада с миндалем.",
        cta: "Сохрани",
      },
      syrupMyth,
    ],
  });
  assert.throws(
    () => assertStrategyAnchored(strategy, corpus.texts),
    (error: Error) =>
      error.name === "SourceAnchorError" && /выдумал «сироп»/i.test(error.message),
  );
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

test("CIS corpus: junk Whisper and mock fallback are not a heard voice", () => {
  assert.equal(isUsableVoiceText("."), false);
  assert.equal(
    isUsableVoiceText("Go for the ride That would be the best Hey, hey", {
      expectCyrillic: true,
    }),
    false,
  );
  assert.equal(
    isUsableVoiceText(
      "Riding in the drop top at the top down, saw you switching lanes, girl",
      { expectCyrillic: true },
    ),
    false,
  );
  assert.equal(
    isUsableVoiceText(
      "Стоп, если ролик умирает после трёх секунд. Тема: 1/0. Дальше один приём: удар в первой фразе, потом доказательство, потом мягкий финал.",
    ),
    false,
  );
  assert.equal(isUsableVoiceText("200°C-392°F 10-15分"), false);

  const daria = sourceCorpus({
    bio: DARIA_BIO,
    captions: DARIA_CAPTIONS,
    transcriptions: DARIA_WHISPER_RAW,
  });
  assert.equal(daria.voiceHeard, false);
  assert.equal(daria.strength, "weak");
  assert.equal(captionSourceStrength({ bio: DARIA_BIO, captions: DARIA_CAPTIONS }), "weak");
  assert.equal(
    captionSourceStrength({
      bio: DARIA_BIO,
      captions: [
        `${DARIA_CAPTION}\n#fitnessmotivation`,
        `${DARIA_CAPTION}\n#онлайнтренировки`,
        `${DARIA_CAPTION}\n#agrefit`,
      ],
    }),
    "weak",
  );

  const prodasha = sourceCorpus({
    bio: PRODASHA_BIO,
    captions: PRODASHA_CAPTIONS,
    transcriptions: [PRODASHA_SONG],
  });
  assert.equal(prodasha.voiceHeard, false);
  assert.equal(prodasha.strength, "ok");

  const eugenius = sourceCorpus({
    bio: EUGENIUS_BIO,
    captions: EUGENIUS_CAPTIONS,
    transcriptions: [EUGENIUS_MOCK_FALLBACK],
  });
  assert.equal(eugenius.voiceHeard, false);

  const ksenia = sourceCorpus({
    bio: KSENIA_BIO,
    captions: KSENIA_CAPTIONS,
    transcriptions: KSENIA_WHISPER_RAW,
  });
  assert.equal(ksenia.voiceHeard, true);
  assert.ok(ksenia.usableVoice.some((item) => /ипотек|ставка/i.test(item)));
  assert.equal(usableTranscriptions(KSENIA_WHISPER_RAW, [KSENIA_BIO, ...KSENIA_CAPTIONS]).length, 1);
});

test("weak duplicate fitness captions reject invented split and fire-strategy hype", () => {
  const corpus = sourceCorpus({
    bio: DARIA_BIO,
    captions: DARIA_CAPTIONS,
    transcriptions: DARIA_WHISPER_RAW,
  });
  assert.equal(corpus.strength, "weak");

  const invented = {
    title: "Почему домашняя тренировка не работает",
    format: "Reels 15с · ошибка",
    duration_sec: 15,
    hook_options: ["Домашние тренировки не работают"],
    teleprompter_script:
      "0–3с: Домашние тренировки не работают, если ты просто повторяешь случайные упражнения.\n3–8с: Сегодня ноги, завтра пресс, а между ними — длинный перерыв.\n8–12с: Вместо этого собери короткую последовательность и повторяй её регулярно.\n12–15с: Сохрани, чтобы следующая тренировка дома была не случайной.",
    caption: "Случайные ноги и пресс.",
    cta: "Сохрани",
  };
  const honest = {
    title: "Связки упражнений дома после 35",
    format: "Reels 15с · ошибка",
    duration_sec: 15,
    hook_options: ["Связки упражнений дома после 35"],
    teleprompter_script:
      "0–3с: Стоп. Связки упражнений, которые можно сделать дома.\n3–8с: Я Даша, тренер с опытом более 15 лет.\n8–12с: После 35 выглядеть на 20 — с домашних тренировок, не с чужого зала.\n12–15с: Сохрани связку.",
    caption: "Связки упражнений дома. secretagre.",
    cta: "Сохрани",
  };
  const strategy = normalizeStrategy({
    niche: "Стратегия огонь для фитнеса",
    target_audience: "Женщины 35+",
    content_pillars: [{ title: "Дома", description: "Связки" }],
    profile_audit_tips: ["Контент огонь, вирусный план на месяц."],
    scripts: [invented, { ...honest, duration_sec: 30 }, { ...honest, title: "Онлайнтренер", duration_sec: 45 }],
  });
  assert.throws(
    () => assertStrategyAnchored(strategy, corpus.texts, corpus.strength),
    (error: Error) =>
      error.name === "SourceAnchorError" &&
      (/огонь|выдумал/i.test(error.message)),
  );

  const honestStrategy = normalizeStrategy({
    niche: "Домашние тренировки после 35",
    target_audience: "Женщины, которым нужен домашний формат",
    content_pillars: [{ title: "Связки", description: "Упражнения дома" }],
    profile_audit_tips: ["Подписи одинаковые — не выдумывай программу."],
    scripts: [
      honest,
      {
        ...honest,
        title: "Онлайнтренер 15 лет",
        format: "Reels 30с · процесс",
        duration_sec: 30,
        teleprompter_script:
          "0–3с: Онлайнтренер. Опыт более 15 лет.\n3–16с: Связки упражнений дома, не чужой зал.\n16–24с: После 35 выглядеть на 20 — из био, не из выдумки.\n24–30с: Сохрани.",
      },
      {
        ...honest,
        title: "secretagre",
        format: "Reels 45с · миф",
        duration_sec: 45,
        teleprompter_script:
          "0–3с: Миф: без зала нельзя.\n3–22с: В подписи — домашние тренировки и связки упражнений.\n22–38с: secretagre, онлайнтренер, опыт 15 лет.\n38–45с: Сохрани.",
      },
    ],
  });
  assert.doesNotThrow(() =>
    assertStrategyAnchored(honestStrategy, corpus.texts, corpus.strength),
  );
  const tipped = withSourceHonestyTips(honestStrategy, {
    voiceHeard: false,
    strength: "weak",
  });
  assert.equal(tipped.profile_audit_tips[0], WEAK_SOURCE_TIP);
});

test("weak captions without 3 facts must pause; 3 facts unlock generation", () => {
  assert.equal(
    shouldPauseForFacts({
      strength: "weak",
      facts: [],
      offerSummary: "",
    }),
    true,
  );
  assert.equal(
    shouldPauseForFacts({
      strength: "ok",
      facts: [],
      offerSummary: "",
    }),
    false,
  );
  assert.equal(
    shouldPauseForFacts({
      strength: "weak",
      facts: [
        "Онлайн-тренировки дома без зала и тренажёров",
        "После 35 клиентки бросают через неделю без плана",
        "Связки по 20 минут, стаж тренера 15 лет",
      ],
    }),
    false,
  );
});

