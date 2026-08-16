import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AnalysisStatus,
  ProfileGoal,
  SubscriptionPlan,
  ToneOfVoice,
} from "@prisma/client";

import {
  LLM_MODEL_FREE,
  LLM_MODEL_PRO,
  llmModelForPlan,
} from "@/lib/ai/aitunnel";
import { isUsableTeleprompter } from "@/lib/ai/normalize-strategy";
import { WHISPER_MAX_VIDEOS } from "@/lib/content/scrape-limits";
import { prisma } from "@/lib/prisma";
import { checkDbHealth } from "@/lib/db-health";
import {
  ANALYSIS_STATUS_SEQUENCE,
  clearAnalysisStatusTrace,
  getAnalysisStatusTrace,
  runAnalysisForExisting,
} from "@/lib/pipeline/run-analysis";
import { enqueueAnalysis } from "@/lib/queue/analysis-queue";
import { YOUTUBE_UNSUPPORTED_MESSAGE } from "@/lib/platform";

function dedupeConsecutive(values: string[]) {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

async function seedUser(plan: SubscriptionPlan, handle: string, platform: string) {
  const telegramId = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 999));
  return prisma.user.create({
    data: {
      telegramId,
      username: `cycle_${telegramId}`,
      firstName: "Цикл",
      socialHandle: handle,
      platform,
      profileGoal: ProfileGoal.GROW_AUDIENCE,
      toneOfVoice: ToneOfVoice.EXPERT,
      subscriptionPlan: plan,
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      onboardedAt: new Date(),
    },
  });
}

test("luna/terra route by plan without live calls", () => {
  assert.equal(LLM_MODEL_FREE, "gpt-5.6-luna");
  assert.equal(LLM_MODEL_PRO, "gpt-5.6-terra");
  assert.equal(llmModelForPlan("FREE"), "gpt-5.6-luna");
  assert.equal(llmModelForPlan("START"), "gpt-5.6-luna");
  assert.equal(llmModelForPlan("PRO"), "gpt-5.6-terra");
  assert.equal(llmModelForPlan("AGENCY"), "gpt-5.6-terra");
});

test("Postgres health check does not leak secrets", async () => {
  const health = await checkDbHealth();
  assert.equal(health.ok, true);
  assert.equal(health.db, "up");
  assert.equal(JSON.stringify(health).includes("postgres:postgres"), false);
});

test("mock pipeline: SCRAPING→TRANSCRIBING→GENERATING→COMPLETED, Whisper top-3, суфлёр", async () => {
  process.env.MOCK_EXTERNAL_APIS = "true";
  const user = await seedUser(SubscriptionPlan.START, "desertmsk", "instagram");
  const analysis = await prisma.profileAnalysis.create({
    data: {
      userId: user.id,
      socialHandle: user.socialHandle!,
      platform: user.platform!,
      status: AnalysisStatus.QUEUED,
    },
  });

  clearAnalysisStatusTrace();
  const done = await runAnalysisForExisting(user, analysis.id);
  assert.equal(done.status, AnalysisStatus.COMPLETED);

  const trace = dedupeConsecutive(getAnalysisStatusTrace(analysis.id));
  assert.deepEqual(trace, [...ANALYSIS_STATUS_SEQUENCE]);

  const transcriptions = done.transcriptions as string[] | null;
  assert.ok(Array.isArray(transcriptions));
  assert.equal(transcriptions.length, WHISPER_MAX_VIDEOS);
  assert.ok(transcriptions.every((text) => text.trim().length > 0));

  assert.equal(done.scripts.length, 3);
  const durations = [15, 30, 45];
  done.scripts.forEach((script, index) => {
    const duration = durations[index] ?? 30;
    assert.ok(script.teleprompterScript.trim().length > 0);
    assert.match(script.teleprompterScript, /0\s*[–—-]\s*3/);
    assert.ok(script.cta.trim().length > 0);
    assert.equal(isUsableTeleprompter(script.teleprompterScript, duration), true);
  });
});

test("memory queue reaches COMPLETED with a non-empty teleprompter", async () => {
  process.env.MOCK_EXTERNAL_APIS = "true";
  delete process.env.REDIS_URL;
  const user = await seedUser(SubscriptionPlan.START, "desertmsk", "instagram");
  const queued = await enqueueAnalysis({
    userId: user.id,
    socialHandle: user.socialHandle!,
    platform: user.platform!,
  });
  assert.equal(queued.mode, "memory");

  const started = Date.now();
  let status = AnalysisStatus.QUEUED;
  let scripts: Array<{ teleprompterScript: string }> = [];
  while (Date.now() - started < 20_000) {
    const row = await prisma.profileAnalysis.findUniqueOrThrow({
      where: { id: queued.analysisId },
      include: { scripts: true },
    });
    status = row.status;
    scripts = row.scripts;
    if (status === AnalysisStatus.COMPLETED || status === AnalysisStatus.FAILED) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  assert.equal(status, AnalysisStatus.COMPLETED);
  assert.ok(scripts.length >= 1);
  assert.ok(scripts.every((script) => script.teleprompterScript.trim().length > 0));
});

test("YouTube analysis is refused before scrape", async () => {
  process.env.MOCK_EXTERNAL_APIS = "true";
  const user = await seedUser(SubscriptionPlan.START, "linguamarina", "youtube");
  const analysis = await prisma.profileAnalysis.create({
    data: {
      userId: user.id,
      socialHandle: "linguamarina",
      platform: "youtube",
      status: AnalysisStatus.QUEUED,
    },
  });
  await assert.rejects(
    () => runAnalysisForExisting(user, analysis.id),
    (err: Error) => err.message === YOUTUBE_UNSUPPORTED_MESSAGE,
  );
  const failed = await prisma.profileAnalysis.findUniqueOrThrow({
    where: { id: analysis.id },
  });
  assert.equal(failed.status, AnalysisStatus.FAILED);
});
