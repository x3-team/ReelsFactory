import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractFactAnchors,
  selectVariableSlotsForAngle,
} from "@/lib/ai/fact-extractor";
import { getViralSkeleton } from "@/lib/ai/viral-skeletons";

test("extractFactAnchors extracts products, numbers, and categorizes problems and terms", () => {
  const bio = "Шеф-кондитер. Авторский зефир и бенто-торты на заказ. Гайд по температуре сиропа 110°C.";
  const captions = [
    "Почему зефир плывёт и не держит форму? Ошибка в агаре или температуре сиропа.",
    "Как собрать бенто-торт за 15 минут без комков в креме.",
    "3 секрета идеального зефира: масса отламывается кусочками, а не тянется.",
  ];
  const transcriptions = [
    "Стоп. Если зефир плывёт — проверь термометр. Нужна температура ровно 110 градусов.",
  ];

  const facts = extractFactAnchors({
    bio,
    captions,
    transcriptions,
    offerSummary: "чеклист по зефиру",
    strength: "ok",
  });

  assert.ok(facts.products.length > 0);
  assert.ok(facts.products.some((p) => /зефир|бенто|торт/i.test(p)));
  assert.ok(facts.numbersAndStats.length > 0);
  assert.ok(facts.numbersAndStats.some((n) => /110|15/i.test(n)));
  assert.ok(facts.primaryAnchorPool.length >= 3);
});

test("selectVariableSlotsForAngle assigns variables for 15s, 30s, 45s skeletons", () => {
  const facts = {
    products: ["авторский зефир", "бенто-торт"],
    mistakesAndProblems: ["зефир плывёт", "комки в креме"],
    keyTermsAndActions: ["температура сиропа 110°C", "отламывается кусочками"],
    numbersAndStats: ["110°C", "15 минут"],
    offerTerms: ["гайд по зефиру"],
    primaryAnchorPool: ["зефир", "температура", "сироп", "агар"],
  };

  const slot0 = selectVariableSlotsForAngle(facts, 0, "десертах");
  assert.ok(slot0.PRODUCT_VAR);
  assert.ok(slot0.PROBLEM_VAR);
  assert.ok(slot0.FACT_OR_ACTION_VAR);
  assert.ok(slot0.CTA_VAR);

  const slot1 = selectVariableSlotsForAngle(facts, 1, "десертах");
  assert.ok(slot1.PRODUCT_VAR);
  assert.notEqual(slot1.PRODUCT_VAR, "");
});

test("VIRAL_SKELETONS contains valid structures for all 3 angles", () => {
  const angles = ["error", "process", "myth_or_contrast"] as const;
  for (const angle of angles) {
    const skeleton = getViralSkeleton(angle);
    assert.equal(skeleton.angle, angle);
    assert.ok(skeleton.durationSec === 15 || skeleton.durationSec === 30 || skeleton.durationSec === 45);
    assert.ok(skeleton.hookTemplates.length >= 2);
    assert.ok(skeleton.visualCue.start0_3s);
    assert.ok(skeleton.visualCue.midAction);
    assert.ok(skeleton.visualCue.finalCta);
  }
});
