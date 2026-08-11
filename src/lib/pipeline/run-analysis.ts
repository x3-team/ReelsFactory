import { AnalysisStatus, type User } from "@prisma/client";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { Platform } from "@/lib/platform";
import type { ScrapedProfile } from "@/lib/types";

export async function runAnalysisPipeline(user: User) {
  if (!user.socialHandle || !user.platform || !user.profileGoal || !user.toneOfVoice) {
    throw new Error("User onboarding incomplete");
  }

  const analysis = await prisma.profileAnalysis.create({
    data: {
      userId: user.id,
      socialHandle: user.socialHandle,
      platform: user.platform,
      status: AnalysisStatus.SCRAPING,
    },
  });

  try {
    const profile = await parseProfile({
      handle: user.socialHandle,
      platform: user.platform as Platform,
    });

    await prisma.profileAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: AnalysisStatus.TRANSCRIBING,
        rawProfileData: profile as unknown as object,
      },
    });

    const transcriptions: string[] = [];
    for (const video of profile.topVideos.slice(0, 5)) {
      const { text } = await transcribeAudio({
        audioUrl: video.audioUrl || video.url,
        hint: video.caption,
      });
      transcriptions.push(text);
    }

    await prisma.profileAnalysis.update({
      where: { id: analysis.id },
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
    });

    const paid = hasPaidAccess(user);
    const scriptsToSave = paid ? strategy.scripts : strategy.scripts.slice(0, 1);

    await prisma.$transaction(async (tx) => {
      await tx.profileAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: AnalysisStatus.COMPLETED,
          niche: strategy.niche,
          targetAudience: strategy.target_audience,
          contentPillars: strategy.content_pillars,
          profileAuditTips: strategy.profile_audit_tips,
        },
      });

      for (const script of scriptsToSave) {
        await tx.script.create({
          data: {
            userId: user.id,
            analysisId: analysis.id,
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
      where: { id: analysis.id },
      include: { scripts: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    await prisma.profileAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: AnalysisStatus.FAILED,
        errorMessage:
          error instanceof Error ? error.message : "Analysis pipeline failed",
      },
    });
    throw error;
  }
}

export type { ScrapedProfile };
