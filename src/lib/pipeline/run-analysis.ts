import { AnalysisStatus, SubscriptionPlan, type User } from "@prisma/client";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { PLANS } from "@/lib/config";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { videosForWhisper } from "@/lib/content/scrape-limits";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { Platform } from "@/lib/platform";
import type { ScrapedProfile } from "@/lib/types";

function scriptsLimit(user: User) {
  if (!hasPaidAccess(user)) return 1;
  return PLANS[user.subscriptionPlan]?.scriptsPerMonth ?? 12;
}

function pillarsLimit(user: User) {
  if (user.subscriptionPlan === SubscriptionPlan.START) return 1;
  if (user.subscriptionPlan === SubscriptionPlan.FREE) return 3;
  return 10;
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

    // Whisper только top-3 с качаемым audio/video; страница tiktok.com не подходит.
    const transcriptions: string[] = [];
    for (const video of videosForWhisper(profile.topVideos)) {
      const audioUrl = video.audioUrl || video.videoUrl;
      if (!audioUrl) continue;
      const { text } = await transcribeAudio({
        audioUrl,
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
          errorMessage: null,
        },
      });

      for (const script of scriptsToSave) {
        await tx.script.create({
          data: {
            userId: user.id,
            analysisId,
            title: script.title,
            format: script.format,
            hookOptions: script.hook_options,
            teleprompterScript: script.teleprompter_script,
            caption: script.caption,
            cta: script.cta,
            isTeaser: !paid,
          },
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
