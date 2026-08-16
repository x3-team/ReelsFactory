import {
  extractAnchorPhrases,
  type CaptionSourceStrength,
} from "@/lib/ai/source-anchors";

export type ExtractedFactAnchors = {
  products: string[];
  mistakesAndProblems: string[];
  keyTermsAndActions: string[];
  numbersAndStats: string[];
  offerTerms: string[];
  primaryAnchorPool: string[];
};

export type FactVariableSlots = {
  PRODUCT_VAR: string;
  PROBLEM_VAR: string;
  FACT_OR_ACTION_VAR: string;
  CTA_VAR: string;
};

const NUMBER_REGEX = /\b\d+(?:[.,]\d+)?(?:\s*(?:°[cс]|%|к|k|руб|₽|мин|сек|с|шт|г|кг))?\b/gi;

const COMMON_OFFER_KEYWORDS = [
  "гайд",
  "курс",
  "урок",
  "чеклист",
  "шапк",
  "профил",
  "ссылк",
  "консультаци",
  "заказ",
  "скидк",
  "бонус",
  "мастер-класс",
  "мк",
];

export function extractFactAnchors(input: {
  bio?: string | null;
  captions?: string[] | null;
  transcriptions?: string[] | null;
  offerSummary?: string | null;
  strength: CaptionSourceStrength;
}): ExtractedFactAnchors {
  const texts: string[] = [
    input.bio || "",
    ...(input.captions || []),
    ...(input.transcriptions || []),
    input.offerSummary || "",
  ].filter(Boolean);

  const rawAnchors = extractAnchorPhrases(texts);
  const fullCorpus = texts.join("\n");

  const numbersAndStats: string[] = Array.from(
    new Set(fullCorpus.match(NUMBER_REGEX) || []),
  ).slice(0, 10);

  const offerTerms: string[] = [];
  const products: string[] = [];
  const mistakesAndProblems: string[] = [];
  const keyTermsAndActions: string[] = [];

  for (const anchor of rawAnchors) {
    const lower = anchor.toLowerCase();
    if (COMMON_OFFER_KEYWORDS.some((kw) => lower.includes(kw))) {
      offerTerms.push(anchor);
    } else if (
      /ошибк|проблем|почему|не работ|плыв[её]т|лом|тянет|косяк|комк|минус|слишком/i.test(
        lower,
      )
    ) {
      mistakesAndProblems.push(anchor);
    } else if (
      /зефир|торт|бенто|машин|ремонт|бмв|bmw|ногти|маникюр|тренировк|зал|курс|канал|стрижк|квартир|десерт|молок/i.test(
        lower,
      )
    ) {
      products.push(anchor);
    } else {
      keyTermsAndActions.push(anchor);
    }
  }

  // Если категориальные списки пусты, берём базовые анкоры
  if (products.length === 0 && rawAnchors.length > 0) {
    products.push(rawAnchors[0]!);
  }

  return {
    products: products.slice(0, 6),
    mistakesAndProblems: mistakesAndProblems.slice(0, 6),
    keyTermsAndActions: keyTermsAndActions.slice(0, 8),
    numbersAndStats,
    offerTerms: offerTerms.slice(0, 5),
    primaryAnchorPool: rawAnchors.slice(0, 15),
  };
}

/**
 * Подбирает переменные фактуры для конкретного угла сценария
 */
export function selectVariableSlotsForAngle(
  facts: ExtractedFactAnchors,
  angleIndex: number,
  fallbackNiche = "контенте",
): FactVariableSlots {
  const product =
    facts.products[angleIndex % Math.max(facts.products.length, 1)] ||
    facts.primaryAnchorPool[angleIndex % Math.max(facts.primaryAnchorPool.length, 1)] ||
    fallbackNiche;

  const problem =
    facts.mistakesAndProblems[angleIndex % Math.max(facts.mistakesAndProblems.length, 1)] ||
    facts.primaryAnchorPool[(angleIndex + 1) % Math.max(facts.primaryAnchorPool.length, 1)] ||
    "падают охваты и вовлечение";

  const factOrAction =
    facts.keyTermsAndActions[angleIndex % Math.max(facts.keyTermsAndActions.length, 1)] ||
    facts.numbersAndStats[0] ||
    facts.primaryAnchorPool[(angleIndex + 2) % Math.max(facts.primaryAnchorPool.length, 1)] ||
    "дело в одной ключевой детали";

  const cta =
    facts.offerTerms[0] || "Сохраните ролик и напишите ключевое слово в комментарии.";

  return {
    PRODUCT_VAR: product,
    PROBLEM_VAR: problem,
    FACT_OR_ACTION_VAR: factOrAction,
    CTA_VAR: cta,
  };
}
