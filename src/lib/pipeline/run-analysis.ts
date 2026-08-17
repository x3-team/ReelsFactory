import { AnalysisStatus, SubscriptionPlan, type Prisma, type User } from "@prisma/client";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { isUsableTeleprompter } from "@/lib/ai/normalize-strategy";
import { contentStems, isUsableVoiceText, profileLooksCyrillic } from "@/lib/ai/source-anchors";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { videosForWhisper, whisperSourceUrl } from "@/lib/content/scrape-limits";
import { prisma } from "@/lib/prisma";
import { assertSupportedPlatform, type Platform } from "@/lib/platform";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { ScrapedProfile } from "@/lib/types";
import { hasPaidAccess } from "@/lib/users";

/** Ожидаемый ход пайплайна (очередь ставит QUEUED отдельно). */
export const ANALYSIS_STATUS_SEQUENCE = [
  AnalysisStatus.SCRAPING,
  AnalysisStatus.TRANSCRIBING,
  AnalysisStatus.GENERATING,
  AnalysisStatus.COMPLETED,
] as const;

type StatusTraceEntry = { analysisId: string; status: AnalysisStatus };
const statusTrace: StatusTraceEntry[] = [];

export function getAnalysisStatusTrace(analysisId?: string) {
  if (!analysisId) return statusTrace.map((entry) => entry.status);
  return statusTrace
    .filter((entry) => entry.analysisId === analysisId)
    .map((entry) => entry.status);
}

export function clearAnalysisStatusTrace() {
  statusTrace.length = 0;
}

async function markStatus(
  analysisId: string,
  status: AnalysisStatus,
  data: Prisma.ProfileAnalysisUpdateInput = {},
) {
  statusTrace.push({ analysisId, status });
  return prisma.profileAnalysis.update({
    where: { id: analysisId },
    data: { status, ...data },
  });
}

/** Один анализ всегда даёт пакет 15/30/45. Free читает первый суфлёр, остальные — paywall. */
const SCRIPT_PACK_SIZE = 3;

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
    assertSupportedPlatform(user.platform);
    await markStatus(analysisId, AnalysisStatus.SCRAPING, {
      socialHandle: user.socialHandle,
      platform: user.platform,
    });

    const profile = await parseProfile({
      handle: user.socialHandle,
      platform: user.platform as Platform,
    });

    await markStatus(analysisId, AnalysisStatus.TRANSCRIBING, {
      rawProfileData: profile as unknown as Prisma.InputJsonValue,
    });

    // Whisper только top-3; мусор (заставка/песня/mock) в LLM не идёт.
    const captionSide = [
      profile.bio || "",
      ...profile.topVideos.map((video) => video.caption || ""),
    ];
    const expectCyrillic = profileLooksCyrillic(captionSide);
    const sourceStems = contentStems(captionSide.join("\n"));
    const transcriptions: string[] = [];
    for (const video of videosForWhisper(profile.topVideos)) {
      const audioUrl = whisperSourceUrl(video);
      if (!audioUrl) continue;
      const { text, mocked } = await transcribeAudio({
        audioUrl,
        hint: video.caption,
      });
      if (!text.trim()) continue;
      if (mocked) {
        transcriptions.push(text);
        continue;
      }
      if (isUsableVoiceText(text, { expectCyrillic, sourceStems })) {
        transcriptions.push(text);
      }
    }

    await markStatus(analysisId, AnalysisStatus.GENERATING, {
      transcriptions,
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
    const scriptsToSave = strategy.scripts.slice(0, SCRIPT_PACK_SIZE);
    const pillars = strategy.content_pillars.slice(0, pillarsLimit(user));
    if (!scriptsToSave.length) {
      throw new Error("Пайплайн не собрал сценарии");
    }
    for (const script of scriptsToSave) {
      if (
        !script.teleprompter_script?.trim() ||
        !isUsableTeleprompter(script.teleprompter_script, script.duration_sec || 30)
      ) {
        throw new Error("Пустой суфлёр — анализ не записываем");
      }
    }

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

      for (let index = 0; index < scriptsToSave.length; index += 1) {
        const script = scriptsToSave[index];
        if (!script) continue;
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
            visualCues: script.visual_cues as unknown as Prisma.InputJsonValue,
            isTeaser: !paid && index > 0,
          },
        });
      }
    });

    statusTrace.push({ analysisId, status: AnalysisStatus.COMPLETED });

    return prisma.profileAnalysis.findUniqueOrThrow({
      where: { id: analysisId },
      include: { scripts: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    statusTrace.push({ analysisId, status: AnalysisStatus.FAILED });
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
