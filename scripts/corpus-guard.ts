/**
 * Exit codes for real-run / corpus-run:
 *   0 — handle may proceed (demo handle, or live scrape is possible)
 *   2 — HARD STOP: public corpus account, no live scrape
 *   3 — YouTube: we do not scrape it; do not invent a Reels audit
 *   4 — platform unknown: do not guess Instagram
 */
import { canScrapePlatform, envHasScraping } from "../src/lib/honesty.ts";
import { detectPlatform } from "../src/lib/platform.ts";
import { corpusLiveKind, lookupCorpus } from "../src/lib/test-corpus.ts";

const handle = process.argv[2] || "";
if (!handle) {
  console.error("usage: corpus-guard.ts @handle");
  process.exit(1);
}

const hit = lookupCorpus(handle);
const platform = hit?.platform || detectPlatform(handle);
const kind = corpusLiveKind(hit);

if (!hit) {
  if (platform === "youtube") {
    console.error("YouTube не скрейпим. Не пишем «стратегия огонь для Reels».");
    process.exit(3);
  }
  process.exit(0);
}

if (kind === "unknown" || !hit.platform) {
  console.error(
    `@${hit.handle}: площадка не подтверждена владельцем. Не угадываем Instagram.`,
  );
  process.exit(4);
}

if (kind === "youtube-unsupported") {
  console.error(
    `@${hit.handle}: YouTube (${hit.entry.note}). Живого разбора нет — отказ, не мок.`,
  );
  process.exit(3);
}

if (!envHasScraping() || !canScrapePlatform(platform)) {
  console.error(
    `@${hit.handle}: корпус, live невозможен без ключа скрейпа. Не подставляем демо.`,
  );
  process.exit(2);
}

process.exit(0);
