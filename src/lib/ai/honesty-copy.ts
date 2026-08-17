/** Первая строка tips, если голос не разобрали. */
export const VOICE_MISSING_TIP =
  "Голос роликов не разобрали — сценарии собраны по подписям, не «как будто слышали» речь. Когда появится звук, переснимите хук с фразы из кадра.";

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
