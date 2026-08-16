/**
 * Reuse last SUCCEEDED Apify dataset (no new actor run) + luna scripts
 * for @desertmsk live fixture. Writes /opt/cursor/artifacts.
 *
 *   MOCK_EXTERNAL_APIS=false APIFY_REUSE_ONLY=true pnpm exec tsx --tsconfig tsconfig.json scripts/reuse-strategy-ping.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  DESERTMSK_LIVE_PROFILE,
  DESERTMSK_LIVE_WHISPER_RAW,
  DESERTMSK_PREVIOUS_LIVE_SCRIPTS,
} from "@/lib/ai/fixtures/desertmsk-live";
import { generateStrategy } from "@/lib/ai/generate-strategy";
import {
  extractAnchorPhrases,
  scriptHasSourceAnchor,
  sourceCorpus,
} from "@/lib/ai/source-anchors";
import { parseProfile } from "@/lib/scraping/parse-profile";

process.env.MOCK_EXTERNAL_APIS = "false";
process.env.APIFY_REUSE_ONLY = "true";

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";

function countInvented(teleprompter: string) {
  return {
    syrup: /сироп/i.test(teleprompter),
    curl: /завиток/i.test(teleprompter),
    stickyThread: /липк(ой|ая) нитк/i.test(teleprompter),
    zefirBreak: /отсаж|кусочк|отлам/i.test(teleprompter),
    bentoButter: /сливочного масла|птичьего молока|клубник/i.test(teleprompter),
    marshmallow: /маршмеллоу|пружин|белк/i.test(teleprompter),
  };
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true }).catch(() => undefined);

  let reusedProfile = DESERTMSK_LIVE_PROFILE;
  let scrapeMode = DESERTMSK_LIVE_PROFILE.scrapeMode || "apify-reuse";
  try {
    reusedProfile = await parseProfile({ handle: "desertmsk", platform: "instagram" });
    scrapeMode = reusedProfile.scrapeMode || scrapeMode;
  } catch (error) {
    console.warn(
      "Apify reuse parse failed, using fixture profile",
      error instanceof Error ? error.message : error,
    );
  }

  const transcriptions = DESERTMSK_LIVE_WHISPER_RAW.map((item) => item.text);
  const source = sourceCorpus({
    bio: reusedProfile.bio,
    captions: reusedProfile.topVideos.map((video) => video.caption || ""),
    transcriptions,
  });

  const started = Date.now();
  const { strategy, mocked, model } = await generateStrategy({
    profile: reusedProfile,
    transcriptions,
    goal: "GROW_AUDIENCE",
    tone: "EXPERT",
    plan: "START",
  });

  const compared = strategy.scripts.map((script, index) => {
    const previous = DESERTMSK_PREVIOUS_LIVE_SCRIPTS[index];
    const hits = scriptHasSourceAnchor(script, source.texts);
    return {
      durationSec: script.duration_sec,
      was: previous
        ? {
            title: previous.title,
            teleprompter: previous.teleprompter,
            invented: countInvented(previous.teleprompter),
            hits: scriptHasSourceAnchor(
              {
                title: previous.title,
                hook_options: [],
                teleprompter_script: previous.teleprompter,
                caption: "",
              },
              source.texts,
            ),
          }
        : null,
      now: {
        title: script.title,
        format: script.format,
        hooks: script.hook_options,
        cta: script.cta,
        teleprompter: script.teleprompter_script,
        invented: countInvented(script.teleprompter_script),
        hits,
      },
    };
  });

  const report = {
    handle: reusedProfile.handle,
    scrapeMode,
    followers: reusedProfile.followers,
    voiceHeard: source.voiceHeard,
    usableVoice: source.usableVoice,
    anchors: extractAnchorPhrases(source.texts),
    mocked,
    model,
    ms: Date.now() - started,
    niche: strategy.niche,
    tips: strategy.profile_audit_tips,
    compared,
  };

  const jsonPath = join(ARTIFACT_DIR, "desertmsk_anchor_compare.json");
  const mdPath = join(ARTIFACT_DIR, "desertmsk_anchor_compare.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const md = [
    "# @desertmsk — якоря: было (PR #11) / стало",
    "",
    `- scrapeMode: **${scrapeMode}** (reuse, без новой пачки Apify)`,
    `- model: **${model}** mocked=${mocked}`,
    `- voice_heard: **${source.voiceHeard}** (Whisper top-3 на reuse: музыка/заставка, не речь)`,
    `- niche: ${strategy.niche}`,
    "",
    "## Tips",
    "",
    ...strategy.profile_audit_tips.map((tip) => `- ${tip}`),
    "",
  ];
  for (const row of compared) {
    md.push(
      `## ${row.durationSec}с`,
      "",
      "### Было",
      "",
      `**${row.was?.title || "?"}**`,
      "",
      "```",
      row.was?.teleprompter || "",
      "```",
      "",
      `якоря: ${(row.was?.hits.hits || []).join(", ") || "—"}`,
      "",
      "### Стало",
      "",
      `**${row.now.title}** · ${row.now.format}`,
      "",
      "```",
      row.now.teleprompter,
      "```",
      "",
      `якоря: ${row.now.hits.hits.join(", ") || "—"} · ok=${row.now.hits.ok}`,
      "",
    );
  }
  await writeFile(mdPath, md.join("\n"));
  console.log(
    JSON.stringify(
      {
        ok: true,
        scrapeMode,
        model,
        mocked,
        voiceHeard: source.voiceHeard,
        jsonPath,
        mdPath,
        titles: strategy.scripts.map((script) => script.title),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
