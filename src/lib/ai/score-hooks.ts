export type ScoredHook = { text: string; score: number; reasons: string[] };

const GREETINGS = /^(привет|здравствуйте|хай|hello|всем привет)\b/i;
const WEAK = /^(сегодня|хочу рассказать|в этом видео|смотрите)\b/i;

/**
 * Rank 0–3s hooks for RU/CIS Reels without a second LLM call.
 * Higher = more likely to stop the scroll.
 */
export function scoreHook(text: string): ScoredHook {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  let score = 50;
  const reasons: string[] = [];

  if (words.length >= 5 && words.length <= 12) {
    score += 12;
    reasons.push("длина 5–12 слов");
  } else if (words.length < 4 || words.length > 16) {
    score -= 15;
    reasons.push("слабая длина");
  }

  if (GREETINGS.test(t) || WEAK.test(t)) {
    score -= 25;
    reasons.push("приветствие / вода");
  }

  if (/[?]/.test(t)) {
    score += 8;
    reasons.push("вопрос");
  }
  if (/\d/.test(t)) {
    score += 10;
    reasons.push("цифра");
  }
  if (/(ошибк|не\s+надо|хватит|перестань|убива|умира|секрет|миф)/i.test(t)) {
    score += 12;
    reasons.push("конфликт");
  }
  if (/(вы|ваш|ты|тво)/i.test(t)) {
    score += 6;
    reasons.push("обращение");
  }
  if (t.length > 90) {
    score -= 10;
    reasons.push("длинный для хука");
  }

  return { text: t, score: Math.max(0, Math.min(100, score)), reasons };
}

export function rankHooks(hooks: string[]): string[] {
  return [...hooks]
    .map((h) => scoreHook(h))
    .sort((a, b) => b.score - a.score)
    .map((h) => h.text);
}

export function normalizeTitleKey(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim();
}

export function isDuplicateTitle(title: string, previous: string[]) {
  const key = normalizeTitleKey(title);
  if (!key) return false;
  return previous.some((p) => {
    const pk = normalizeTitleKey(p);
    if (!pk) return false;
    if (pk === key) return true;
    const a = new Set(key.split(" "));
    const b = new Set(pk.split(" "));
    let overlap = 0;
    a.forEach((w) => {
      if (w.length > 3 && b.has(w)) overlap += 1;
    });
    return overlap >= 3 && Math.min(a.size, b.size) <= 6;
  });
}
