import { AnalysisStatus, SubscriptionPlan, type User } from "@prisma/client";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { PLANS } from "@/lib/config";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { Platform } from "@/lib/platform";
import type { GeneratedScript, ScrapedProfile } from "@/lib/types";

function scriptsLimit(user: User) {
  if (!hasPaidAccess(user)) return 1;
  return PLANS[user.subscriptionPlan]?.scriptsPerMonth ?? 12;
}

function pillarsLimit(user: User) {
  if (user.subscriptionPlan === SubscriptionPlan.START) return 1;
  if (user.subscriptionPlan === SubscriptionPlan.FREE) return 3;
  return 10;
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
    });

    await prisma.profileAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.TRANSCRIBING,
        rawProfileData: profile as unknown as object,
      },
    });

    const transcriptions: string[] = [];
    for (const video of profile.topVideos.slice(0, 3)) {
      const { text } = await transcribeAudio({
        audioUrl: video.audioUrl || video.url,
        hint: video.caption,
      });
      transcriptions.push(text);
    }

    await prisma.profileAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.GENERATING,
        transcriptions,
      },
    });

    const { strategy } = await generateStrategy({
      profile,
      transcriptions,
      goal: user.profileGoal,
      tone: user.toneOfVoice,
      offerSummary: user.offerSummary,
      websiteUrl: user.websiteUrl,
      plan: user.subscriptionPlan,
      nichePreset: user.nichePreset,
      voiceDraft: user.voiceDraft,
    });

    const paid = hasPaidAccess(user);
    const scriptsToSave = strategy.scripts.slice(0, scriptsLimit(user));
    const pillars = strategy.content_pillars.slice(0, pillarsLimit(user));

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

      for (const script of scriptsToSave) {
        await tx.script.create({
          data: scriptCreateData(user.id, analysisId, script, paid, "core"),
        });
      }
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
