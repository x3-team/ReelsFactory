/**
 * Corpus reuse ping: 4 live CIS handles after #12.
 * Reuse SUCCEEDED Apify dataset if present; live-run only when reuse is missing.
 * luna + Whisper top-3. No Gemini. Does not print tokens.
 *
 *   MOCK_EXTERNAL_APIS=false pnpm exec tsx --tsconfig tsconfig.json scripts/corpus-reuse-strategy.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import {
  captionSourceStrength,
  extractAnchorPhrases,
  isUsableVoiceText,
  scriptHasSourceAnchor,
  sourceCorpus,
} from "@/lib/ai/source-anchors";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { selectWhisperSources } from "@/lib/ai/whisper-media";
import { WHISPER_MAX_VIDEOS, whisperSourceUrl } from "@/lib/content/scrape-limits";
import { lookupCorpus } from "@/lib/test-corpus";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { Platform } from "@/lib/platform";
import type { ScrapedProfile } from "@/lib/types";

process.env.MOCK_EXTERNAL_APIS = "false";

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
const FALLBACK_DIR = "/tmp/corpus-reuse";

const CORPUS_HANDLES = [
  { handle: "ksenia_makarchuk__", platform: "instagram" as const },
  { handle: "agre_daria_fit", platform: "instagram" as const },
  { handle: "prodasha_live", platform: "instagram" as const },
  { handle: "eugenius_official", platform: "tiktok" as const },
];

function platformFor(handle: string, fallback: Platform): Platform {
  const hit = lookupCorpus(handle);
  if (hit?.platform === "youtube") {
    throw new Error(`YouTube @${handle} не скрейпим`);
  }
  return hit?.platform ?? fallback;
}

async function scrapeWithReuseFirst(handle: string, platform: Platform) {
  const prev = process.env.APIFY_REUSE_ONLY;
  process.env.APIFY_REUSE_ONLY = "true";
  try {
    const profile = await parseProfile({ handle, platform });
    return { profile, scrapeMode: profile.scrapeMode || "apify-reuse", reuseMissing: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/APIFY_REUSE_ONLY/i.test(message)) throw error;
  } finally {
    if (prev === undefined) delete process.env.APIFY_REUSE_ONLY;
    else process.env.APIFY_REUSE_ONLY = prev;
  }

  delete process.env.APIFY_REUSE_ONLY;
  const profile = await parseProfile({ handle, platform });
  return {
    profile,
    scrapeMode: profile.scrapeMode || "live-run",
    reuseMissing: true,
  };
}

function captionStrength(profile: ScrapedProfile) {
  return captionSourceStrength({
    bio: profile.bio,
    captions: profile.topVideos.map((video) => video.caption || ""),
  });
}

async function whisperTop3(profile: ScrapedProfile) {
  const expectCyrillic = /[а-яё]/i.test(
    `${profile.bio || ""} ${profile.topVideos.map((v) => v.caption || "").join(" ")}`,
  );
  const items: Array<{
    id: string;
    views: number;
    caption: string;
    hasMedia: boolean;
    source: "whisper-1" | "caption-fallback" | "no-media";
    mocked: boolean;
    raw: string;
    usable: boolean;
  }> = [];

  for (const { video, url: audio } of await selectWhisperSources(profile.topVideos, {
    max: WHISPER_MAX_VIDEOS,
  })) {
    const result = await transcribeAudio({
      audioUrl: audio,
      hint: video.caption,
    });
    const raw = result.text || "";
    items.push({
      id: video.id,
      views: video.views,
      caption: video.caption || "",
      hasMedia: true,
      source: result.mocked ? "caption-fallback" : "whisper-1",
      mocked: result.mocked,
      raw,
      usable: !result.mocked && isUsableVoiceText(raw, { expectCyrillic }),
    });
  }
  return items;
}

async function runOne(handle: string, platform: Platform) {
  const started = Date.now();
  const scraped = await scrapeWithReuseFirst(handle, platform);
  const profile = scraped.profile;
  const whisper = await whisperTop3(profile);
  const usableVoice = whisper.filter((item) => item.usable).map((item) => item.raw);
  const source = sourceCorpus({
    bio: profile.bio,
    captions: profile.topVideos.map((video) => video.caption || ""),
    transcriptions: whisper.map((item) => item.raw),
  });
  const { strategy, mocked, model } = await generateStrategy({
    profile,
    transcriptions: whisper.map((item) => item.raw),
    goal: "GROW_AUDIENCE",
    tone: "DIRECT",
    plan: "START",
  });

  const scripts = strategy.scripts.map((script) => {
    const hits = scriptHasSourceAnchor(script, source.texts);
    return {
      title: script.title,
      format: script.format,
      durationSec: script.duration_sec,
      hooks: script.hook_options,
      cta: script.cta,
      caption: script.caption,
      teleprompter: script.teleprompter_script,
      anchors: hits,
    };
  });

  return {
    handle,
    platform,
    ms: Date.now() - started,
    scrapeMode: scraped.scrapeMode,
    reuseMissing: scraped.reuseMissing,
    followers: profile.followers,
    displayName: profile.displayName || null,
    bio: profile.bio,
    captionStrength: captionStrength(profile),
    captions: profile.topVideos.map((video) => ({
      id: video.id,
      views: video.views,
      durationSec: video.durationSec ?? null,
      hasAudio: Boolean(whisperSourceUrl(video)),
      caption: video.caption || "",
    })),
    whisper,
    voiceHeard: source.voiceHeard,
    usableVoice: source.usableVoice,
    anchors: extractAnchorPhrases(source.texts),
    strategy: {
      mocked,
      model,
      niche: strategy.niche,
      audience: strategy.target_audience,
      pillars: strategy.content_pillars,
      tips: strategy.profile_audit_tips,
      scripts,
    },
  };
}

function renderHandle(row: Awaited<ReturnType<typeof runOne>>) {
  const lines = [
    `## @${row.handle} (${row.platform})`,
    "",
    `- scrapeMode: **${row.scrapeMode}**${row.reuseMissing ? " (reuse не было — live-run)" : " (reuse, без новой пачки Apify)"}`,
    `- followers: ${row.followers}`,
    `- captionStrength: **${row.captionStrength}**`,
    `- whisper live: ${row.whisper.filter((item) => !item.mocked).length}/${row.whisper.length}, usable=${row.whisper.filter((item) => item.usable).length}, voiceHeard=${row.voiceHeard}`,
    `- model: **${row.strategy.model}** mocked=${row.strategy.mocked}`,
    `- niche: ${row.strategy.niche}`,
    "",
    "### Bio",
    "",
    "```",
    row.bio || "—",
    "```",
    "",
    "### Captions",
    "",
  ];
  for (const cap of row.captions) {
    lines.push(`- \`${cap.id}\` views=${cap.views}: ${(cap.caption || "—").slice(0, 280)}`);
  }
  lines.push("", "### Whisper raw (top-3)", "");
  for (const item of row.whisper) {
    lines.push(
      `- \`${item.id}\` ${item.source} mocked=${item.mocked} usable=${item.usable}: ${(item.raw || "—").slice(0, 240)}`,
    );
  }
  lines.push("", "### Якоря", "", row.anchors.map((item) => `- ${item}`).join("\n") || "—", "");
  lines.push("### Tips", "");
  for (const tip of row.strategy.tips) lines.push(`- ${tip}`);
  lines.push("");
  for (const script of row.strategy.scripts) {
    lines.push(
      `### ${script.durationSec}с — ${script.title}`,
      "",
      "```",
      script.teleprompter,
      "```",
      "",
      `якоря: ${script.anchors.hits.join(", ") || "—"} · ok=${script.anchors.ok}`,
      "",
    );
  }
  return lines.join("\n");
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true }).catch(() => undefined);
  await mkdir(FALLBACK_DIR, { recursive: true }).catch(() => undefined);

  const results: Array<Awaited<ReturnType<typeof runOne>> | { handle: string; error: string }> =
    [];

  for (const row of CORPUS_HANDLES) {
    const handle = row.handle;
    const platform = platformFor(handle, row.platform);
    try {
      const out = await runOne(handle, platform);
      results.push(out);
      const slug = handle.replace(/[^a-z0-9_]+/gi, "_");
      await writeFile(
        join(FALLBACK_DIR, `${slug}.json`),
        JSON.stringify(out, null, 2) + "\n",
      );
      await writeFile(
        join(ARTIFACT_DIR, `corpus_${slug}.json`),
        JSON.stringify(out, null, 2) + "\n",
      ).catch(() => undefined);
      console.log(
        JSON.stringify({
          handle,
          ok: true,
          scrapeMode: out.scrapeMode,
          reuseMissing: out.reuseMissing,
          captionStrength: out.captionStrength,
          whisperLive: out.whisper.filter((item) => !item.mocked).length,
          whisperUsable: out.whisper.filter((item) => item.usable).length,
          voiceHeard: out.voiceHeard,
          model: out.strategy.model,
          mocked: out.strategy.mocked,
          titles: out.strategy.scripts.map((script) => script.title),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ handle, error: message });
      console.error(JSON.stringify({ handle, ok: false, error: message }));
    }
  }

  const md = [
    "# CIS corpus reuse — стратегия после #12",
    "",
    "luna, Whisper top-3, без Gemini. Reuse если датасет есть, live-run только если reuse нет.",
    "",
  ];
  for (const row of results) {
    if ("error" in row) {
      md.push(`## @${row.handle}`, "", `Ошибка: ${row.error}`, "");
      continue;
    }
    md.push(renderHandle(row));
  }

  await writeFile(join(FALLBACK_DIR, "corpus-reuse-report.md"), md.join("\n"));
  await writeFile(join(ARTIFACT_DIR, "corpus_reuse_report.md"), md.join("\n")).catch(
    () => undefined,
  );
  await writeFile(
    join(ARTIFACT_DIR, "corpus_reuse_summary.json"),
    JSON.stringify(
      {
        ok: results.filter((row) => !("error" in row)).length,
        fail: results.filter((row) => "error" in row).length,
        handles: results.map((row) =>
          "error" in row
            ? { handle: row.handle, error: row.error }
            : {
                handle: row.handle,
                scrapeMode: row.scrapeMode,
                captionStrength: row.captionStrength,
                voiceHeard: row.voiceHeard,
                model: row.strategy.model,
                mocked: row.strategy.mocked,
              },
        ),
      },
      null,
      2,
    ) + "\n",
  ).catch(() => undefined);

  const ok = results.filter((row) => !("error" in row)).length;
  if (ok === 0) process.exit(4);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
