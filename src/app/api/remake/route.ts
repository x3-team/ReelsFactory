import { NextResponse } from "next/server";
import { z } from "zod";

import { generateViralRemake } from "@/lib/ai/generate-remake";
import { hasPaidAccess } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceCaption: z.string().max(2000).optional(),
  sourceTranscript: z.string().max(8000).optional(),
  analysisId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    const { remake, mocked, model } = await generateViralRemake({
      sourceUrl: body.sourceUrl,
      sourceCaption: body.sourceCaption,
      sourceTranscript: body.sourceTranscript,
      niche: undefined,
      goal: user.profileGoal,
      tone: user.toneOfVoice,
      offerSummary: user.offerSummary,
      nichePreset: user.nichePreset,
      plan,
    });

    let savedScript = null;
    if (body.analysisId) {
      const analysis = await prisma.profileAnalysis.findFirst({
        where: { id: body.analysisId, userId: user.id },
      });
      if (analysis) {
        savedScript = await prisma.script.create({
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
            commentKeyword: remake.remake.comment_keyword ?? null,
            platformPacks: remake.platform_packs as object,
            funnel: remake.funnel as object,
            propsChecklist: remake.remake.props_checklist ?? undefined,
            sourceType: "remake",
          },
        });
      }
    }

    return NextResponse.json(
      serialize({ remake, script: savedScript, mocked, model }),
    );
  } catch (error) {
    console.error("POST /api/remake", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Remake failed" },
      { status: 400 },
    );
  }
}
