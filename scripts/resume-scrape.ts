/**
 * Resume live scrape + luna scripts after the Apify quota bump.
 *
 *   pnpm scrape:resume -- --ping-only
 *   pnpm scrape:resume
 *   HANDLES=karinakross,victoriabonya pnpm scrape:resume
 *   FORCE_RESCRAPE=1 HANDLES=desertmsk pnpm scrape:resume
 *
 * Does not print tokens. Writes artifacts under /opt/cursor/artifacts and /tmp.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { llmModel } from "@/lib/ai/aitunnel";
import { transcribeAudio } from "@/lib/ai/transcribe";
import {
  WHISPER_MAX_VIDEOS,
  videosForWhisper,
  whisperSourceUrl,
} from "@/lib/content/scrape-limits";
import { lookupCorpus } from "@/lib/test-corpus";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { Platform } from "@/lib/platform";
import type { ScrapedProfile } from "@/lib/types";

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
const FALLBACK_DIR = "/tmp/apify-resume";

/** Live-снято 16.08.2026 — не гоняем повторно без FORCE_RESCRAPE=1 */
const ALREADY_SCRAPED_2026_08_16 = [
  "ksenia_makarchuk__",
  "agre_daria_fit",
  "prodasha_live",
  "eugenius_official",
  "desertmsk",
];

/** Ещё не снятые live из docs/CIS_TEST_CORPUS.md (без YouTube и @tanyatgym). */
const DEFAULT_HANDLES = [
  "karinakross",
  "victoriabonya",
  "goar_avetisyan",
  "krava_nakormit",
  "homm9k",
  "botagozomarova2",
];

type PingReport = {
  tokenPresent: boolean;
  tokenLength: number;
  tokenPrefix: "apify_api_" | "other" | null;
  usersMeStatus: number | null;
  username?: string;
  planId?: string;
  maxMonthlyUsageUsd?: number;
  monthlyUsageUsd?: number;
  remainingUsd?: number;
  cycleStart?: string;
  error?: string;
};

function tokenMeta() {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || "";
  return {
    tokenPresent: Boolean(token),
    tokenLength: token.length,
    tokenPrefix: token
      ? token.startsWith("apify_api_")
        ? ("apify_api_" as const)
        : ("other" as const)
      : null,
    token,
  };
}

async function pingApify(): Promise<PingReport> {
  const meta = tokenMeta();
  const base: PingReport = {
    tokenPresent: meta.tokenPresent,
    tokenLength: meta.tokenLength,
    tokenPrefix: meta.tokenPrefix,
    usersMeStatus: null,
  };
  if (!meta.token) {
    base.error = "нет APIFY_TOKEN";
    return base;
  }

  const headers = { Authorization: `Bearer ${meta.token}` };
  const meRes = await fetch("https://api.apify.com/v2/users/me", {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  base.usersMeStatus = meRes.status;
  if (!meRes.ok) {
    const body = await meRes.text().catch(() => "");
    const slim = body.toLowerCase();
    base.error = slim.includes("monthly usage hard limit")
      ? `Apify ${meRes.status}: monthly hard limit`
      : `Apify users/me ${meRes.status}`;
    return base;
  }
  const meJson = (await meRes.json()) as {
    data?: { username?: string; plan?: { id?: string; maxMonthlyUsageUsd?: number } };
  };
  base.username = meJson.data?.username;
  base.planId = meJson.data?.plan?.id;
  base.maxMonthlyUsageUsd = meJson.data?.plan?.maxMonthlyUsageUsd;

  const limRes = await fetch("https://api.apify.com/v2/users/me/limits", {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (limRes.ok) {
    const lim = (await limRes.json()) as {
      data?: {
        monthlyUsageCycle?: { startAt?: string };
        limits?: { maxMonthlyUsageUsd?: number };
        current?: { monthlyUsageUsd?: number };
      };
    };
    const max =
      lim.data?.limits?.maxMonthlyUsageUsd ?? base.maxMonthlyUsageUsd ?? 0;
    const used = lim.data?.current?.monthlyUsageUsd ?? 0;
    base.maxMonthlyUsageUsd = max;
    base.monthlyUsageUsd = used;
    base.remainingUsd = Math.max(0, max - used);
    base.cycleStart = lim.data?.monthlyUsageCycle?.startAt;
  }
  return base;
}

function handlesFromEnv() {
  const raw = process.env.HANDLES || "";
  const listed = raw.trim()
    ? raw
        .split(/[,\s]+/)
        .map((item) => item.replace(/^@/, "").trim())
        .filter(Boolean)
    : DEFAULT_HANDLES;
  if (process.env.FORCE_RESCRAPE === "1") return listed;
  const skip = new Set(ALREADY_SCRAPED_2026_08_16);
  return listed.filter((handle) => !skip.has(handle));
}

function platformFor(handle: string): Platform {
  const hit = lookupCorpus(handle);
  if (hit?.platform && hit.platform !== "youtube") return hit.platform;
  if (hit?.platform === "youtube") {
    throw new Error(`YouTube @${handle} не скрейпим`);
  }
  throw new Error(`@${handle} нет в корпусе — новые аккаунты не выдумываем`);
}

async function writeJson(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function writeText(path: string, data: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data, "utf8");
}

function profileSummary(profile: ScrapedProfile) {
  return {
    handle: profile.handle,
    platform: profile.platform,
    displayName: profile.displayName || null,
    followers: profile.followers,
    postsCount: profile.postsCount ?? null,
    scrapeMode: profile.scrapeMode || "live-run",
    videos: profile.topVideos.length,
    videosWithAudio: profile.topVideos.filter((video) =>
      Boolean(whisperSourceUrl(video)),
    ).length,
    topVideos: profile.topVideos.map((video) => ({
      id: video.id,
      url: video.url,
      views: video.views,
      likes: video.likes ?? null,
      durationSec: video.durationSec ?? null,
      caption: (video.caption || "").slice(0, 180),
      hasAudio: Boolean(whisperSourceUrl(video)),
    })),
  };
}

async function runOne(handle: string, whisperBudget: number) {
  const platform = platformFor(handle);
  const started = Date.now();
  const profile = await parseProfile({ handle, platform });
  const whisperLimit = Math.min(WHISPER_MAX_VIDEOS, whisperBudget);
  const transcriptions: Array<{ source: string; mocked: boolean; text: string }> = [];

  for (const video of videosForWhisper(profile.topVideos).slice(0, whisperLimit)) {
    const audio = whisperSourceUrl(video) || "";
    if (!audio) {
      transcriptions.push({
        source: "caption",
        mocked: true,
        text: video.caption || "",
      });
      continue;
    }
    const result = await transcribeAudio({
      audioUrl: audio,
      hint: video.caption,
    });
    transcriptions.push({
      source: result.mocked ? "caption-fallback" : "whisper-1",
      mocked: result.mocked,
      text: result.text,
    });
  }

  const { strategy, mocked, model } = await generateStrategy({
    profile,
    transcriptions: transcriptions.map((item) => item.text),
    goal: "GROW_AUDIENCE",
    tone: "DIRECT",
    plan: "START",
  });

  return {
    handle,
    platform,
    ms: Date.now() - started,
    profile: profileSummary(profile),
    whisper: {
      requested: whisperLimit,
      live: transcriptions.filter((item) => !item.mocked).length,
      items: transcriptions.map((item) => ({
        source: item.source,
        mocked: item.mocked,
        chars: item.text.length,
      })),
    },
    strategy: {
      mocked,
      model,
      niche: strategy.niche,
      targetAudience: strategy.target_audience,
      pillars: strategy.content_pillars.length,
      scripts: strategy.scripts.map((script) => ({
        title: script.title,
        format: script.format,
        durationSec: script.duration_sec ?? null,
        hooks: script.hook_options,
        cta: script.cta,
        caption: script.caption,
        teleprompter: script.teleprompter_script,
      })),
    },
  };
}

function renderReport(input: {
  ping: PingReport;
  model: string;
  results: Array<Awaited<ReturnType<typeof runOne>> | { handle: string; error: string }>;
}) {
  const lines = [
    `# Apify resume — ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Ping",
    "",
    `- APIFY_TOKEN: ${input.ping.tokenPresent ? "present" : "нет APIFY_TOKEN"} (prefix=${input.ping.tokenPrefix || "none"}, length=${input.ping.tokenLength})`,
    `- users/me: ${input.ping.usersMeStatus ?? "n/a"}`,
    `- account: ${input.ping.username || "?"} · plan ${input.ping.planId || "?"}`,
    `- usage: $${(input.ping.monthlyUsageUsd ?? 0).toFixed(4)} / $${input.ping.maxMonthlyUsageUsd ?? "?"} (остаток ≈ $${(input.ping.remainingUsd ?? 0).toFixed(2)})`,
    `- cycle start: ${input.ping.cycleStart || "?"}`,
    `- LLM: ${input.model} (START)`,
    "",
    "## Прогоны",
    "",
  ];

  for (const row of input.results) {
    if ("error" in row) {
      lines.push(`### @${row.handle}`, "", `Ошибка: ${row.error}`, "");
      continue;
    }
    lines.push(
      `### @${row.handle} (${row.platform})`,
      "",
      `- scrape: ${row.profile.scrapeMode}, ${row.profile.videos} роликов, audioUrl=${row.profile.videosWithAudio}, followers=${row.profile.followers}`,
      `- whisper live: ${row.whisper.live}/${row.whisper.requested}`,
      `- model: ${row.strategy.model}${row.strategy.mocked ? " (MOCK)" : ""}`,
      `- niche: ${row.strategy.niche}`,
      `- сценариев: ${row.strategy.scripts.length}`,
      "",
    );
    for (const script of row.strategy.scripts) {
      lines.push(
        `#### ${script.title} · ${script.format} · ${script.durationSec || "?"}с`,
        "",
        script.teleprompter,
        "",
        `CTA: ${script.cta}`,
        "",
      );
    }
  }
  return lines.join("\n");
}

async function main() {
  process.env.MOCK_EXTERNAL_APIS = "false";
  const pingOnly = process.argv.includes("--ping-only");
  const ping = await pingApify();
  const model = llmModel();

  const outDirs = [ARTIFACT_DIR, FALLBACK_DIR];
  for (const dir of outDirs) {
    await mkdir(dir, { recursive: true }).catch(() => undefined);
  }

  await writeJson(join(FALLBACK_DIR, "apify-ping.json"), ping);
  await writeJson(join(ARTIFACT_DIR, "apify_ping.json"), ping).catch(() => undefined);

  if (!ping.tokenPresent) {
    console.error("нет APIFY_TOKEN");
    process.exit(2);
  }
  if (ping.error) {
    console.error(ping.error);
    process.exit(3);
  }

  console.log(
    JSON.stringify(
      {
        ping: { ...ping },
        model,
        pingOnly,
      },
      null,
      2,
    ),
  );

  if (pingOnly) return;

  const handles = handlesFromEnv();
  const results: Array<Awaited<ReturnType<typeof runOne>> | { handle: string; error: string }> = [];

  for (const handle of handles) {
    try {
      const row = await runOne(handle, WHISPER_MAX_VIDEOS);
      results.push(row);
      const name = handle.replace(/[^a-z0-9_]+/gi, "_");
      await writeJson(join(FALLBACK_DIR, `${name}.json`), row);
      await writeJson(join(ARTIFACT_DIR, `resume_${name}.json`), row).catch(
        () => undefined,
      );
      console.log(
        JSON.stringify({
          handle,
          ok: true,
          scrapeMode: row.profile.scrapeMode,
          videos: row.profile.videos,
          scripts: row.strategy.scripts.length,
          model: row.strategy.model,
          mocked: row.strategy.mocked,
          whisperLive: row.whisper.live,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ handle, error: message });
      console.error(JSON.stringify({ handle, ok: false, error: message }));
    }
  }

  const report = renderReport({ ping, model, results });
  await writeText(join(FALLBACK_DIR, "resume-report.md"), report);
  await writeText(join(ARTIFACT_DIR, "apify_resume_report.md"), report).catch(
    () => undefined,
  );

  const ok = results.filter((row) => !("error" in row)).length;
  const scripts = results.reduce((sum, row) => {
    if ("error" in row) return sum;
    return sum + row.strategy.scripts.length;
  }, 0);
  const videos = results.reduce((sum, row) => {
    if ("error" in row) return sum;
    return sum + row.profile.videos;
  }, 0);

  console.log(
    JSON.stringify({
      summary: {
        profilesOk: ok,
        profilesFail: results.length - ok,
        videos,
        scripts,
        model,
        remainingUsd: ping.remainingUsd,
      },
    }),
  );

  if (ok === 0) process.exit(4);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
