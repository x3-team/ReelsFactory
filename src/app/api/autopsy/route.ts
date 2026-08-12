import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAutopsy } from "@/lib/ai/generate-autopsy";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  sourceUrl: z.string().url(),
  caption: z.string().max(2000).optional(),
  transcript: z.string().max(8000).optional(),
  analysisId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    const analysis = body.analysisId
      ? await prisma.profileAnalysis.findFirst({
          where: { id: body.analysisId, userId: user.id },
        })
      : await prisma.profileAnalysis.findFirst({
          where: { userId: user.id, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
        });

    const { autopsy, mocked, model } = await generateAutopsy({
      sourceUrl: body.sourceUrl,
      caption: body.caption,
      transcript: body.transcript,
      niche: analysis?.niche,
      offerSummary: user.offerSummary,
      plan: user.subscriptionPlan,
    });

    let savedScript = null;
    if (analysis) {
      savedScript = await prisma.script.create({
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
    }

    return NextResponse.json(
      serialize({ autopsy, script: savedScript, mocked, model }),
    );
  } catch (error) {
    console.error("POST /api/autopsy", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Autopsy failed" },
      { status: 400 },
    );
  }
}
