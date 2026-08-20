/** Первая строка tips, если голос не разобрали. */
export const VOICE_MISSING_TIP =
  "Голос роликов не разобрали — сценарии caption-sourced: только подписи и био, не «текст в камеру с рилса». Когда появится звук, переснимите хук с фразы из кадра.";

/** Подписи пустые или копипаст — не выдаём «стратегия огонь». */
export const WEAK_SOURCE_TIP =
  "Подписи пустые или копипаст — это не «стратегия огонь». Сценарии только из био/подписей, без выдуманных упражнений, граммовок и приёмов.";

export function shouldShowVoiceBanner(input: {
  voiceHeard?: boolean | null;
  profileAuditTips?: string[] | null;
}) {
  if (input.voiceHeard === true) return false;
  if (input.voiceHeard === false) return true;
  return (input.profileAuditTips || []).some((tip) =>
    /голос роликов не разобрали/i.test(tip),
  );
}

/** 403/402 без reuse — не выдаём «разбор прошёл» и не подменяем демо. */
export const APIFY_HARD_LIMIT_NO_REUSE_MESSAGE =
  "Сейчас не разбираем этот аккаунт: у Apify месячный лимит, повтор прошлого датасета не нашли. Это не демо и не «разбор прошёл». Попробуйте позже.";

export const APIFY_BLOCKED_NO_REUSE_MESSAGE =
  "Apify не отдал профиль. Это не демо и не «разбор прошёл» — сценариев нет. Попробуйте позже.";

/** 403, но взяли уже оплаченный датасет того же хендла. */
export const APIFY_REUSE_TIP =
  "Новый скрейп сейчас недоступен (лимит Apify). Сценарии из последнего сохранённого разбора этого аккаунта — не свежая лента.";

export function shouldShowReuseBanner(input: {
  scrapeMode?: string | null;
  profileAuditTips?: string[] | null;
}) {
  if (input.scrapeMode === "apify-reuse") return true;
  return (input.profileAuditTips || []).some((tip) =>
    /лимит apify|последнего сохранённого разбора/i.test(tip),
  );
}
