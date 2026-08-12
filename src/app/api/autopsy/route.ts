import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAutopsy } from "@/lib/ai/generate-autopsy";
import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { recordCostEvent } from "@/lib/cost-meter";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { assertCanAutopsy, QuotaError } from "@/lib/usage";

const bodySchema = z.object({
  userId: z.string().min(1),
  sourceUrl: z.string().url(),
  caption: z.string().max(2000).optional(),
  transcript: z.string().max(8000).optional(),
  analysisId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await requireUser(request, body.userId);

    if (
      !hasPaidAccess(user) ||
      (user.subscriptionPlan !== "PRO" && user.subscriptionPlan !== "AGENCY")
    ) {
      return NextResponse.json(
        {
          error: "Разбор «не залетело» доступен на тарифах Про и Агентство",
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

    const usage = await assertCanAutopsy(user);

    const { autopsy, mocked, model } = await generateAutopsy({
      sourceUrl: body.sourceUrl,
      caption: body.caption,
      transcript: body.transcript,
      niche: analysis.niche,
      offerSummary: user.offerSummary,
      plan: user.subscriptionPlan,
    });

    const savedScript = await prisma.script.create({
      data: {
        userId: user.id,
        analysisId: analysis.id,
        title: autopsy.reshoot_script.title,
        format: autopsy.reshoot_script.format,
        hookOptions: autopsy.reshoot_script.hook_options,
        teleprompterScript: autopsy.reshoot_script.teleprompter_script,
        caption: autopsy.reshoot_script.caption,
        cta: autopsy.reshoot_script.cta,
        isTeaser: false,
        durationSec: autopsy.reshoot_script.duration_sec ?? 20,
        commentKeyword: autopsy.reshoot_script.comment_keyword ?? null,
        sourceType: "autopsy",
      },
    });
    if (!mocked) {
      await recordCostEvent("llm", user.id, "autopsy");
    }

    return NextResponse.json(
      serialize({
        autopsy,
        script: savedScript,
        mocked,
        model,
        usage: {
          ...usage.usage,
          remaining: {
            ...usage.remaining,
            autopsies: Math.max(0, usage.remaining.autopsies - 1),
            scripts: Math.max(0, usage.remaining.scripts - 1),
          },
        },
      }),
    );
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/autopsy", error);
    const status = error instanceof QuotaError ? 402 : 400;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Autopsy failed",
        code: error instanceof QuotaError ? error.code : undefined,
      },
      { status },
    );
  }
}
