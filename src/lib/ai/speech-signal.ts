const STOCK_AUDIO = [
  /thank you for watching/i,
  /thanks for watching/i,
  /like and subscribe/i,
  /subscribe to (the |my )?channel/i,
  /don't forget to subscribe/i,
  /チャンネル/,
  /登録をお願い/,
  /please subscribe/i,
  /copyright/i,
];

/**
 * Whisper on process/music reels often returns stock outros or CJK.
 * Those must not be treated as the author's voice.
 */
export function isUsableTranscript(text: string | null | undefined): boolean {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length < 18) return false;
  if (STOCK_AUDIO.some((re) => re.test(t))) return false;

  const cyr = (t.match(/[А-Яа-яЁё]/g) || []).length;
  const lat = (t.match(/[A-Za-z]/g) || []).length;
  const foreign =
    (t.match(
      /[\u3040-\u30ff\u3400-\u9fff\u0E00-\u0E7F\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u1100-\u11FF\uAC00-\uD7AF]/g,
    ) || []).length;
  const letters = cyr + lat;

  if (letters < 12) return false;
  if (foreign >= 4 && cyr < 10) return false;
  if (cyr < 10 && lat >= cyr * 2) return false;
  return true;
}

export function contentModeFromTranscripts(
  texts: string[],
): "talking_head" | "process_no_speech" {
  return texts.some(isUsableTranscript) ? "talking_head" : "process_no_speech";
}
