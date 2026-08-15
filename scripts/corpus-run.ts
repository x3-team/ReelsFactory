/**
 * CIS test corpus runner.
 *
 * Without APIFY_TOKEN / RAPIDAPI_KEY: print the matrix and HARD STOP.
 * Never pretend a public account was analyzed.
 *
 * With a scrape key: only the first batch (4–6 handles). YouTube stays a
 * documented refuse, not a mock lifestyle audit.
 */
import {
  canScrapePlatform,
  envHasApify,
  envHasScraping,
  resolveHonesty,
} from "../src/lib/honesty.ts";
import { TEST_CORPUS, corpusLiveKind, firstBatchHandles } from "../src/lib/test-corpus.ts";

const honesty = resolveHonesty();
const scrape = envHasScraping();
const apify = envHasApify();

type Row = {
  handle: string;
  platform: string;
  tier: string;
  firstBatch: string;
  live: string;
  note: string;
};

const rows: Row[] = [];

for (const entry of TEST_CORPUS) {
  const kind = corpusLiveKind({
    entry,
    handle: entry.handle,
    platform: entry.platform,
    viaAlias: false,
  });
  let live = "нет";
  if (kind === "youtube-unsupported") live = "отказ 400 (YouTube не скрейпим)";
  else if (kind === "unknown") live = "не гоняем — площадка не указана";
  else if (kind === "tiktok" && !apify) live = "нужен APIFY_TOKEN";
  else if (kind === "instagram" && !scrape) live = "нужен APIFY_TOKEN или RAPIDAPI_KEY";
  else if (kind === "tiktok" && apify) live = "можно (TikTok / Apify)";
  else if (kind === "instagram" && scrape) live = "можно (IG)";

  rows.push({
    handle: `@${entry.handle}`,
    platform: entry.platform || "не указана",
    tier: entry.tier,
    firstBatch: entry.firstBatch ? "да" : "",
    live,
    note: entry.note,
  });
}

console.log("CIS test corpus — 16 публичных хендлов от владельца. Новых @ нет.");
console.log(
  `honesty.mode=${honesty.mode} scrape=${scrape} apify=${apify} ai=${honesty.ai}`,
);
console.log("");
console.table(rows);
console.log("Алиасы (не отдельные аккаунты):");
for (const entry of TEST_CORPUS) {
  for (const alias of entry.aliases || []) {
    console.log(
      `  @${alias.handle} → @${entry.handle} (${alias.platform || "площадка не угадана"})${alias.note ? ` — ${alias.note}` : ""}`,
    );
  }
}

if (!scrape) {
  console.error("");
  console.error("HARD STOP: нет APIFY_TOKEN и нет RAPIDAPI_KEY.");
  console.error("Live-прогон не запускался. Демо по этим хендлам — враньё.");
  console.error("Первая пачка, когда появится ключ:");
  console.error(`  ${firstBatchHandles().map((h) => `@${h}`).join(" ")}`);
  process.exit(2);
}

const batch = TEST_CORPUS.filter((entry) => entry.firstBatch);
console.log("");
console.log("Ключ скрейпа есть. Первая пачка (не все 16):");
for (const entry of batch) {
  const ok = entry.platform ? canScrapePlatform(entry.platform) : false;
  console.log(
    `  @${entry.handle}  ${entry.platform || "?"}  ${ok ? "RUN" : "SKIP — " + entry.note}`,
  );
}
