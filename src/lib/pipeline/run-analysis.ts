import { AnalysisStatus, SubscriptionPlan, type Prisma, type User } from "@prisma/client";

import { generateStrategy } from "@/lib/ai/generate-strategy";
import { isUsableTeleprompter } from "@/lib/ai/normalize-strategy";
import {
  WEAK_SOURCE_TIP,
  contentStems,
  isUsableVoiceText,
  normalizeUserFacts,
  profileLooksCyrillic,
  shouldPauseForFacts,
  sourceCorpus,
} from "@/lib/ai/source-anchors";
import { APIFY_REUSE_TIP } from "@/lib/ai/honesty-copy";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { selectWhisperSources } from "@/lib/ai/whisper-media";
import { prisma } from "@/lib/prisma";
import { assertSupportedPlatform, type Platform } from "@/lib/platform";
import { parseProfile } from "@/lib/scraping/parse-profile";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";
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

function parseFacts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return normalizeUserFacts(value.map((item) => String(item)));
}

function withReuseTip(tips: string[], scrapeMode?: string | null) {
  if (scrapeMode !== "apify-reuse") return tips;
  if (tips.some((tip) => /лимит apify|последнего сохранённого разбора/i.test(tip))) {
    return tips;
  }
  return [APIFY_REUSE_TIP, ...tips].slice(0, 6);
}

function asScrapedProfile(raw: unknown, fallback: { handle: string; platform: string }): ScrapedProfile {
  const rec = raw && typeof raw === "object" ? (raw as ScrapedProfile) : null;
  if (!rec || !Array.isArray(rec.topVideos)) {
    throw new Error("Нет сохранённого профиля — запустите разбор ещё раз");
  }
  return {
    ...rec,
    handle: rec.handle || fallback.handle,
    platform: (rec.platform || fallback.platform) as ScrapedProfile["platform"],
    bio: rec.bio || "",
    followers: rec.followers || 0,
    topVideos: rec.topVideos,
  };
}

async function persistStrategy(input: {
  user: User;
  analysisId: string;
  strategy: StrategyPayload;
  voiceHeard: boolean;
  scrapeMode?: string | null;
}) {
  const paid = hasPaidAccess(input.user);
  const scriptsToSave = input.strategy.scripts.slice(0, SCRIPT_PACK_SIZE);
  const pillars = input.strategy.content_pillars.slice(0, pillarsLimit(input.user));
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
    await tx.script.deleteMany({ where: { analysisId: input.analysisId } });
    await tx.profileAnalysis.update({
      where: { id: input.analysisId },
      data: {
        status: AnalysisStatus.COMPLETED,
        niche: input.strategy.niche,
        targetAudience: input.strategy.target_audience,
        contentPillars: pillars,
        profileAuditTips: withReuseTip(
          input.strategy.profile_audit_tips,
          input.scrapeMode,
        ),
        voiceHeard: input.voiceHeard,
        scrapeMode: input.scrapeMode || null,
        errorMessage: null,
      },
    });

    for (let index = 0; index < scriptsToSave.length; index += 1) {
      const script = scriptsToSave[index];
      if (!script) continue;
      await tx.script.create({
        data: {
          userId: input.user.id,
          analysisId: input.analysisId,
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

  statusTrace.push({ analysisId: input.analysisId, status: AnalysisStatus.COMPLETED });
}

export async function runAnalysisForExisting(user: User, analysisId: string) {
  if (!user.socialHandle || !user.platform || !user.profileGoal || !user.toneOfVoice) {
    throw new Error("Онбординг пользователя не завершён");
  }

  try {
    assertSupportedPlatform(user.platform);
    const existing = await prisma.profileAnalysis.findUnique({ where: { id: analysisId } });
    const extraFacts = parseFacts(existing?.sourceFacts);

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
      scrapeMode: profile.scrapeMode || null,
    });

    const captionSide = [
      profile.bio || "",
      ...profile.topVideos.map((video) => video.caption || ""),
    ];
    const expectCyrillic = profileLooksCyrillic(captionSide);
    const sourceStems = contentStems(captionSide.join("\n"));
    const transcriptions: string[] = [];
    for (const { video, url: audioUrl } of await selectWhisperSources(profile.topVideos)) {
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

    const source = sourceCorpus({
      bio: profile.bio,
      captions: profile.topVideos.map((video) => video.caption || ""),
      transcriptions,
      extraFacts,
      offerSummary: user.offerSummary,
    });

    if (
      shouldPauseForFacts({
        strength: source.strength,
        facts: extraFacts,
        offerSummary: user.offerSummary,
      })
    ) {
      await markStatus(analysisId, AnalysisStatus.NEEDS_FACTS, {
        transcriptions,
        sourceStrength: source.strength,
        profileAuditTips: withReuseTip(
          [
            WEAK_SOURCE_TIP,
            "Напишите 3 конкретных факта: продукт, типичная ошибка клиента, цифра или приём. Без этого не соберём сценарий — не будем выдумывать.",
          ],
          profile.scrapeMode,
        ),
        scrapeMode: profile.scrapeMode || null,
        errorMessage: null,
      });
      return prisma.profileAnalysis.findUniqueOrThrow({
        where: { id: analysisId },
        include: { scripts: { orderBy: { createdAt: "asc" } } },
      });
    }

    await markStatus(analysisId, AnalysisStatus.GENERATING, {
      transcriptions,
      sourceStrength: source.strength,
    });

    const { strategy } = await generateStrategy({
      profile,
      transcriptions,
      goal: user.profileGoal,
      tone: user.toneOfVoice,
      offerSummary: user.offerSummary,
      extraFacts,
      websiteUrl: user.websiteUrl,
      plan: user.subscriptionPlan,
    });

    await persistStrategy({ user, analysisId, strategy, voiceHeard: source.voiceHeard, scrapeMode: profile.scrapeMode });

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

export async function continueAnalysisWithFacts(input: {
  user: User;
  analysisId: string;
  facts: string[];
  offerSummary?: string | null;
}) {
  const analysis = await prisma.profileAnalysis.findUnique({
    where: { id: input.analysisId },
  });
  if (!analysis || analysis.userId !== input.user.id) {
    throw new Error("Анализ не найден");
  }
  if (analysis.status !== AnalysisStatus.NEEDS_FACTS) {
    throw new Error("Этот разбор не ждёт фактов");
  }

  const facts = normalizeUserFacts(input.facts);
  if (facts.length < 3) {
    throw new Error("Нужны 3 факта — продукт, ошибка клиента и цифра или приём");
  }

  if (input.offerSummary?.trim()) {
    await prisma.user.update({
      where: { id: input.user.id },
      data: { offerSummary: input.offerSummary.trim() },
    });
    input.user.offerSummary = input.offerSummary.trim();
  }

  const profile = asScrapedProfile(analysis.rawProfileData, {
    handle: analysis.socialHandle,
    platform: analysis.platform,
  });
  const transcriptions = Array.isArray(analysis.transcriptions)
    ? analysis.transcriptions.map((item) => String(item))
    : [];

  try {
    await prisma.profileAnalysis.update({
      where: { id: input.analysisId },
      data: {
        sourceFacts: facts,
        sourceStrength: analysis.sourceStrength || "weak",
      },
    });

    await markStatus(input.analysisId, AnalysisStatus.GENERATING, {
      sourceFacts: facts,
    });

    const source = sourceCorpus({
      bio: profile.bio,
      captions: profile.topVideos.map((video) => video.caption || ""),
      transcriptions,
      extraFacts: facts,
      offerSummary: input.user.offerSummary,
    });

    const { strategy } = await generateStrategy({
      profile,
      transcriptions,
      goal: input.user.profileGoal || "GROW_AUDIENCE",
      tone: input.user.toneOfVoice || "DIRECT",
      offerSummary: input.user.offerSummary,
      extraFacts: facts,
      websiteUrl: input.user.websiteUrl,
      plan: input.user.subscriptionPlan,
    });

    await persistStrategy({
      user: input.user,
      analysisId: input.analysisId,
      strategy,
      voiceHeard: source.voiceHeard,
      scrapeMode: analysis.scrapeMode || profile.scrapeMode,
    });

    return prisma.profileAnalysis.findUniqueOrThrow({
      where: { id: input.analysisId },
      include: { scripts: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    statusTrace.push({ analysisId: input.analysisId, status: AnalysisStatus.FAILED });
    await prisma.profileAnalysis.update({
      where: { id: input.analysisId },
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
