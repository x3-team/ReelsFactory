/**
 * Re-generate luna scripts from saved corpus JSON (no Apify, no Whisper).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import {
  extractAnchorPhrases,
  scriptHasSourceAnchor,
  sourceCorpus,
} from "@/lib/ai/source-anchors";
import type { ScrapedProfile } from "@/lib/types";

process.env.MOCK_EXTERNAL_APIS = "false";

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";

const FILES = [
  "corpus_ksenia_makarchuk__.json",
  "corpus_agre_daria_fit.json",
  "corpus_prodasha_live.json",
  "corpus_eugenius_official.json",
];

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const rows = [];

  for (const file of FILES) {
    const raw = JSON.parse(await readFile(join(ARTIFACT_DIR, file), "utf8")) as {
      handle: string;
      platform: "instagram" | "tiktok";
      followers: number;
      displayName: string | null;
      bio: string;
      scrapeMode: string;
      captions: Array<{
        id: string;
        views: number;
        durationSec: number | null;
        caption: string;
        hasAudio: boolean;
      }>;
      whisper: Array<{ raw: string }>;
    };

    const profile: ScrapedProfile = {
      handle: raw.handle,
      platform: raw.platform,
      displayName: raw.displayName || undefined,
      bio: raw.bio,
      followers: raw.followers,
      scrapeMode: raw.scrapeMode === "live-run" ? "live-run" : "apify-reuse",
      topVideos: raw.captions.map((cap) => ({
        id: cap.id,
        url: `https://example.com/${cap.id}`,
        caption: cap.caption,
        views: cap.views,
        durationSec: cap.durationSec ?? undefined,
      })),
    };

    const transcriptions = raw.whisper.map((item) => item.raw);
    const source = sourceCorpus({
      bio: profile.bio,
      captions: profile.topVideos.map((video) => video.caption || ""),
      transcriptions,
    });
    const started = Date.now();
    const { strategy, mocked, model } = await generateStrategy({
      profile,
      transcriptions,
      goal: "GROW_AUDIENCE",
      tone: "DIRECT",
      plan: "START",
    });

    const scripts = strategy.scripts.map((script) => ({
      title: script.title,
      format: script.format,
      durationSec: script.duration_sec,
      hookOptions: script.hook_options,
      teleprompter: script.teleprompter_script,
      caption: script.caption,
      cta: script.cta,
      visualCues: script.visual_cues,
      anchors: scriptHasSourceAnchor(script, source.texts),
    }));

    const row = {
      handle: raw.handle,
      scrapeMode: raw.scrapeMode,
      ms: Date.now() - started,
      mocked,
      model,
      strength: source.strength,
      voiceHeard: source.voiceHeard,
      usableVoice: source.usableVoice,
      anchors: extractAnchorPhrases(source.texts),
      niche: strategy.niche,
      tips: strategy.profile_audit_tips,
      scripts,
    };
    rows.push(row);
    console.log(
      JSON.stringify({
        handle: row.handle,
        strength: row.strength,
        voiceHeard: row.voiceHeard,
        model: row.model,
        mocked: row.mocked,
        titles: scripts.map((script) => script.title),
        tip0: row.tips[0],
      }),
    );
  }

  const md = ["# CIS corpus — сценарии после Fact Extractor & Viral Skeletons", ""];
  for (const row of rows) {
    md.push(
      `## @${row.handle}`,
      "",
      `- scrapeMode: ${row.scrapeMode} · strength=${row.strength} · voiceHeard=${row.voiceHeard} · model=${row.model} mocked=${row.mocked}`,
      `- niche: ${row.niche}`,
      "",
      "### Tips",
      "",
      ...row.tips.map((tip) => `- ${tip}`),
      "",
      "### Сценарии:",
      "",
    );
    for (const s of row.scripts) {
      md.push(
        `#### ${s.durationSec}с — ${s.title} (${s.format})`,
        "",
        `- Хуки:`,
        ...(s.hookOptions || []).map((h) => `  * ${h}`),
        `- Суфлёр:`,
        "```",
        s.teleprompter,
        "```",
        `- Подсказки кадра:`,
        `  * 0–3с: ${s.visualCues?.start0_3s || "—"}`,
        `  * середина: ${s.visualCues?.midAction || "—"}`,
        `  * финал: ${s.visualCues?.finalCta || "—"}`,
        `- Якоря: ${s.anchors.hits.join(", ") || "нет"} (ok=${s.anchors.ok})`,
        "",
      );
    }
  }

  await writeFile(join(ARTIFACT_DIR, "corpus_after_guard.md"), md.join("\n"));
  await writeFile(
    join(ARTIFACT_DIR, "corpus_after_guard.json"),
    JSON.stringify(rows, null, 2) + "\n",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
