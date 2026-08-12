import { NextResponse } from "next/server";
import { z } from "zod";

import { generateViralRemake } from "@/lib/ai/generate-remake";
import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { allocateCommentKeyword } from "@/lib/comment-keyword";
import { recordCostEvent } from "@/lib/cost-meter";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { refundQuota } from "@/lib/quota-lock";
import { assertRateLimit, httpErrorStatus } from "@/lib/rate-limit";
import { serialize } from "@/lib/serialize";
import { assertCanRemake, QuotaError } from "@/lib/usage";

const bodySchema = z.object({
  userId: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceCaption: z.string().max(2000).optional(),
  sourceTranscript: z.string().max(8000).optional(),
  analysisId: z.string().min(1),
});

export async function POST(request: Request) {
  let consumed = false;
  let userId: string | null = null;
  try {
    const body = bodySchema.parse(await request.json());
    const user = await requireUser(request, body.userId);
    userId = user.id;
    await assertRateLimit({
      name: "remake",
      id: user.id,
      max: 20,
      windowSec: 3600,
    });

    const plan = user.subscriptionPlan;
    if (!hasPaidAccess(user) || (plan !== "PRO" && plan !== "AGENCY")) {
      return NextResponse.json(
        {
          error:
            "Ремейк вирусных роликов доступен на тарифах Про и Агентство",
          code: "PLAN_REQUIRED",
        },
        { status: 402 },
      );
    }

    const analysis = await prisma.profileAnalysis.findFirst({
      where: { id: body.analysisId, userId: user.id },
    });
    if (!analysis) {
      return NextResponse.json(
        { error: "Сначала нужен готовый анализ профиля" },
        { status: 400 },
      );
    }

    const usage = await assertCanRemake(user);
    consumed = true;

    const { remake, mocked, model } = await generateViralRemake({
      sourceUrl: body.sourceUrl,
      sourceCaption: body.sourceCaption,
      sourceTranscript: body.sourceTranscript,
      niche: analysis.niche,
      goal: user.profileGoal,
      tone: user.toneOfVoice,
      offerSummary: user.offerSummary,
      nichePreset: user.nichePreset,
      plan,
    });

    const commentKeyword = await allocateCommentKeyword(
      remake.remake.comment_keyword ?? remake.funnel?.comment_keyword,
      user.id,
    );

    const savedScript = await prisma.script.create({
      data: {
        userId: user.id,
        analysisId: analysis.id,
        title: remake.remake.title,
        format: remake.remake.format,
        hookOptions: remake.remake.hook_options,
        teleprompterScript: remake.remake.teleprompter_script,
        caption: remake.remake.caption,
        cta: remake.remake.cta,
        isTeaser: false,
        durationSec: remake.remake.duration_sec ?? 30,
        commentKeyword,
        platformPacks: remake.platform_packs as object,
        funnel: remake.funnel as object,
        propsChecklist: remake.remake.props_checklist ?? undefined,
        sourceType: "remake",
      },
    });
    if (!mocked) {
      await recordCostEvent("llm", user.id, "remake");
    }

    return NextResponse.json(
      serialize({
        remake,
        script: savedScript,
        mocked,
        model,
        usage: {
          ...usage.usage,
          remaining: {
            ...usage.remaining,
            remakes: Math.max(0, usage.remaining.remakes - 1),
            scripts: Math.max(0, usage.remaining.scripts - 1),
          },
        },
      }),
    );
  } catch (error) {
    if (consumed && userId) {
      await refundQuota(userId, "remakes").catch(() => undefined);
    }
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/remake", error);
    const status =
      error instanceof QuotaError ? 402 : httpErrorStatus(error, 400);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Remake failed",
        code: error instanceof QuotaError ? error.code : undefined,
      },
      { status },
    );
  }
}
