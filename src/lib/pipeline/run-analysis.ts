import { AnalysisStatus, SubscriptionPlan, type User } from "@prisma/client";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { isUsableTranscript } from "@/lib/ai/speech-signal";
import {
  dropGenericTelegramTips,
  sanitizeStrategy,
} from "@/lib/ai/sanitize-scripts";
import { repairStrategy } from "@/lib/ai/repair-scripts";
import { allocateSharedKeyword } from "@/lib/comment-keyword";
import { PLANS } from "@/lib/config";
import { buildProfileInsights } from "@/lib/content/profile-insights";
import {
  WHISPER_GARBAGE_STREAK_STOP,
  WHISPER_MAX_VIDEOS,
} from "@/lib/content/scrape-limits";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { scheduleShootReminder } from "@/lib/reminders";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { Platform } from "@/lib/platform";
import type { GeneratedScript, ScrapedProfile } from "@/lib/types";
import { getUsageSnapshot } from "@/lib/usage";

function pillarsLimit(user: User) {
  if (user.subscriptionPlan === SubscriptionPlan.START) return 1;
  if (user.subscriptionPlan === SubscriptionPlan.FREE) return 3;
  return 10;
}

async function scriptsToPersist(user: User, scripts: GeneratedScript[]) {
  const paid = hasPaidAccess(user);
  if (!paid) return scripts.slice(0, 1);

  const snap = await getUsageSnapshot(user);
  const planCap = PLANS[user.subscriptionPlan]?.scriptsPerMonth ?? 12;
  const room = Math.min(planCap, snap.remaining.scripts);
  // Analysis itself creates scripts — remaining already includes past month usage,
  // but not this batch; allow up to room (at least 1 if somehow 0 mid-run).
  const limit = Math.max(0, room);
  return scripts.slice(0, Math.max(limit, 0));
}

function scriptCreateData(
  userId: string,
  analysisId: string,
  script: GeneratedScript,
  paid: boolean,
  sourceType = "core",
) {
  return {
    userId,
    analysisId,
    title: script.title,
    format: script.format,
    hookOptions: script.hook_options,
    teleprompterScript: script.teleprompter_script,
    caption: script.caption,
    cta: script.cta,
    isTeaser: !paid,
    durationSec: script.duration_sec ?? null,
    commentKeyword: script.comment_keyword ?? script.funnel?.comment_keyword ?? null,
    platformPacks: script.platform_packs
      ? (script.platform_packs as object)
      : undefined,
    funnel: script.funnel ? (script.funnel as object) : undefined,
    propsChecklist: script.props_checklist ?? undefined,
    shootOrder: script.shoot_order ?? null,
    sourceType,
    sourceAngle: script.source_angle || null,
    shotList: script.shot_list?.length ? script.shot_list : undefined,
  };
}

export async function runAnalysisForExisting(user: User, analysisId: string) {
  if (!user.socialHandle || !user.platform || !user.profileGoal || !user.toneOfVoice) {
    throw new Error("Онбординг пользователя не завершён");
  }

  try {
    await prisma.profileAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.SCRAPING,
        socialHandle: user.socialHandle,
        platform: user.platform,
      },
    });

    const profile = await parseProfile({
      handle: user.socialHandle,
      platform: user.platform as Platform,
      userId: user.id,
    });

    await prisma.profileAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.TRANSCRIBING,
        rawProfileData: profile as unknown as object,
      },
    });

    const insights = buildProfileInsights(profile);

    const transcriptions: string[] = [];
    let garbageStreak = 0;
    for (const video of profile.topVideos.slice(0, WHISPER_MAX_VIDEOS)) {
      if (garbageStreak >= WHISPER_GARBAGE_STREAK_STOP) break;
      if (!video.audioUrl) {
        garbageStreak += 1;
        continue;
      }
      const { text } = await transcribeAudio({
        audioUrl: video.audioUrl,
        hint: video.caption,
        cacheKey: `${user.platform}:${video.id}`,
        userId: user.id,
      });
      if (isUsableTranscript(text)) {
        transcriptions.push(text);
        garbageStreak = 0;
      } else {
        garbageStreak += 1;
      }
    }

    await prisma.profileAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.GENERATING,
        transcriptions,
      },
    });

    const previous = await prisma.script.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { title: true },
    });
    const flew = await prisma.hookFeedback.findMany({
      where: { userId: user.id, outcome: "flew" },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const flewScripts = await prisma.script.findMany({
      where: { id: { in: flew.map((row) => row.scriptId) } },
      select: { id: true, hookOptions: true },
    });
    const byId = new Map(flewScripts.map((s) => [s.id, s]));
    const winningHooks: string[] = [];
    for (const row of flew) {
      const hooks = Array.isArray(byId.get(row.scriptId)?.hookOptions)
        ? (byId.get(row.scriptId)!.hookOptions as string[])
        : [];
      if (hooks[row.hookIndex]) winningHooks.push(hooks[row.hookIndex]);
    }

    const { strategy: rawStrategy } = await generateStrategy({
      profile,
      transcriptions,
      goal: user.profileGoal,
      tone: user.toneOfVoice,
      offerSummary: user.offerSummary,
      websiteUrl: user.websiteUrl,
      plan: user.subscriptionPlan,
      nichePreset: user.nichePreset,
      voiceDraft: user.voiceDraft,
      previousTitles: previous.map((s) => s.title),
      winningHooks,
      userId: user.id,
      insights,
    });

    const keyword = await allocateSharedKeyword(
      insights.suggestedKeyword || rawStrategy.funnel_kit?.comment_keyword,
      user.id,
    );
    const strategy = sanitizeStrategy(
      repairStrategy(sanitizeStrategy(rawStrategy, keyword), insights, keyword),
      keyword,
    );
    strategy.profile_audit_tips = dropGenericTelegramTips(
      strategy.profile_audit_tips || [],
      insights,
    );

    const paid = hasPaidAccess(user);
    const scriptsToSave = await scriptsToPersist(user, strategy.scripts);
    const finalScripts = !paid
      ? strategy.scripts.slice(0, 1)
      : scriptsToSave;
    const pillars = strategy.content_pillars.slice(0, pillarsLimit(user));
    const uniqueScripts: GeneratedScript[] = finalScripts.map((script) => ({
      ...script,
      comment_keyword: keyword,
      funnel: script.funnel
        ? { ...script.funnel, comment_keyword: keyword }
        : script.funnel,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.script.deleteMany({ where: { analysisId } });
      await tx.profileAnalysis.update({
        where: { id: analysisId },
        data: {
          status: AnalysisStatus.COMPLETED,
          niche: strategy.niche,
          targetAudience: strategy.target_audience,
          contentPillars: pillars,
          profileAuditTips: strategy.profile_audit_tips,
          shootDayPlan: strategy.shoot_day
            ? (strategy.shoot_day as object)
            : undefined,
          pillarsCalendar: strategy.pillars_calendar
            ? (strategy.pillars_calendar as object)
            : undefined,
          funnelKit: strategy.funnel_kit
            ? (strategy.funnel_kit as object)
            : undefined,
          autopsyTemplate: strategy.autopsy_template
            ? (strategy.autopsy_template as object)
            : undefined,
          errorMessage: null,
        },
      });

      for (const script of uniqueScripts) {
        await tx.script.create({
          data: scriptCreateData(user.id, analysisId, script, paid, "core"),
        });
      }
    });

    // Best effort: a missing nudge must not fail a finished analysis.
    await scheduleShootReminder({ userId: user.id, analysisId }).catch((error) => {
      console.warn("scheduleShootReminder failed:", error);
    });

    return prisma.profileAnalysis.findUniqueOrThrow({
      where: { id: analysisId },
      include: { scripts: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    await prisma.profileAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.FAILED,
        errorMessage:
          error instanceof Error ? error.message : "Ошибка пайплайна анализа",
      },
    });
    throw error;
  }
}

/** Sync helper (creates analysis row then runs). Prefer enqueueAnalysis for HTTP. */
export async function runAnalysisPipeline(user: User) {
  if (!user.socialHandle || !user.platform) {
    throw new Error("Онбординг пользователя не завершён");
  }

  const analysis = await prisma.profileAnalysis.create({
    data: {
      userId: user.id,
      socialHandle: user.socialHandle,
      platform: user.platform,
      status: AnalysisStatus.SCRAPING,
    },
  });

  return runAnalysisForExisting(user, analysis.id);
}

export type { ScrapedProfile };
