export const TELEPROMPTER_SPEEDS = [
  { id: "slow", label: "Медленнее", scrollFactor: 0.75 },
  { id: "normal", label: "Норма", scrollFactor: 1 },
  { id: "fast", label: "Быстрее", scrollFactor: 1.35 },
] as const;

export type TeleprompterSpeedId = (typeof TELEPROMPTER_SPEEDS)[number]["id"];

export function teleprompterScrollPxPerSec(input: {
  distancePx: number;
  durationSec: number;
  scrollFactor: number;
}) {
  const duration = Math.max(1, input.durationSec);
  const distance = Math.max(0, input.distancePx);
  return (distance * input.scrollFactor) / duration;
}

/** Recording clock for a 15/30/45 reel — not stretched by scroll speed. */
export function formatTeleprompterClock(remainingSec: number) {
  const sec = Math.max(0, Math.ceil(remainingSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function reelDurationSec(value: number): 15 | 30 | 45 {
  if (value === 15 || value === 30 || value === 45) return value;
  return 15;
}

export function clampRemainingSec(elapsedMs: number, durationSec: number) {
  const remaining = durationSec - elapsedMs / 1000;
  return Math.max(0, remaining);
}
