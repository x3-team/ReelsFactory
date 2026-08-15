import { NextResponse } from "next/server";
import { z } from "zod";

import { regenerateHooks } from "@/lib/ai/regenerate-hooks";
import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { recordCostEvent } from "@/lib/cost-meter";
import { prisma } from "@/lib/prisma";
import { assertRateLimit, httpErrorStatus } from "@/lib/rate-limit";
import { serialize } from "@/lib/serialize";
import { hasPaidAccess } from "@/lib/users";

const bodySchema = z.object({
  userId: z.string().min(1),
  scriptId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await requireUser(request, body.userId);
    await assertRateLimit({
      name: "regenerate-hooks",
      id: user.id,
      max: 30,
      windowSec: 3600,
    });

    const script = await prisma.script.findFirst({
      where: { id: body.scriptId, userId: user.id },
      include: { analysis: { select: { niche: true } } },
    });
    if (!script) {
      return NextResponse.json({ error: "Сценарий не найден" }, { status: 404 });
    }
    if (script.isTeaser && !hasPaidAccess(user)) {
      return NextResponse.json(
        {
          error: "Сценарий закрыт — откройте тариф",
          code: "PLAN_REQUIRED",
        },
        { status: 402 },
      );
    }

    const { hooks, mocked, model } = await regenerateHooks({
      title: script.title,
      format: script.format,
      niche: script.analysis?.niche,
      currentHooks: Array.isArray(script.hookOptions)
        ? (script.hookOptions as string[])
        : [],
      teleprompterScript: script.teleprompterScript,
      plan: user.subscriptionPlan,
    });

    const updated = await prisma.script.update({
      where: { id: script.id },
      data: { hookOptions: hooks },
    });
    if (!mocked) {
      await recordCostEvent("llm", user.id, "regenerate-hooks");
    }

    return NextResponse.json(
      serialize({ script: updated, hookOptions: hooks, mocked, model }),
    );
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/scripts/regenerate-hooks", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось обновить хуки",
      },
      { status: httpErrorStatus(error, 400) },
    );
  }
}
