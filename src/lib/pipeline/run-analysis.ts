import { AnalysisStatus, type User } from "@prisma/client";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import {
  captionAsTranscript,
  transcribeAudio,
} from "@/lib/ai/transcribe";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { Platform } from "@/lib/platform";
import type { ScrapedProfile } from "@/lib/types";

/** В одном разборе всегда 3 сценария ↔ 3 темы на неделю */
const WEEKLY_PACK_SIZE = 3;

function scriptsLimit(user: User) {
  // Free: сохраняем 3 сценария (1 полный + 2 залоченных превью для конверсии)
  if (!hasPaidAccess(user)) return WEEKLY_PACK_SIZE;
  // Платный пакет тоже выдаёт пачку из 3 за один анализ (лимит/мес — отдельно в тарифе)
  return WEEKLY_PACK_SIZE;
}

function pillarsLimit(_user: User) {
  return WEEKLY_PACK_SIZE;
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

    // В LLM уходят captions топ-роликов. Whisper — только при ENABLE_WHISPER=true, макс 1 ролик.
    // Берём до 5 сильных видео в контекст (сценариев всё равно 3).
    const videos = profile.topVideos.slice(0, 5);
    const transcriptions = await Promise.all(
      videos.map(async (video, index) => {
        if (index === 0) {
          const { text } = await transcribeAudio({
            audioUrl: video.audioUrl || video.url,
            hint: video.caption,
          });
          return text;
        }
        return captionAsTranscript(video.caption);
      }),
    );

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

      for (let index = 0; index < scriptsToSave.length; index++) {
        const script = scriptsToSave[index]!;
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
            // Free: первый сценарий полный, остальные — превью под замок
            isTeaser: !paid && index > 0,
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
