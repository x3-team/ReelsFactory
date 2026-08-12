import { NextResponse } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const OUTCOMES = new Set(["flew", "flopped"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      scriptId?: string;
      hookIndex?: number;
      outcome?: string;
    };
    const user = await requireUser(request, body.userId);
    if (
      !body.scriptId ||
      typeof body.hookIndex !== "number" ||
      !OUTCOMES.has(body.outcome ?? "")
    ) {
      return NextResponse.json(
        { error: "Нужны scriptId, hookIndex и outcome" },
        { status: 400 },
      );
    }

    const script = await prisma.script.findFirst({
      where: { id: body.scriptId, userId: user.id },
      select: { id: true },
    });
    if (!script) {
      return NextResponse.json({ error: "Сценарий не найден" }, { status: 404 });
    }

    const row = await prisma.hookFeedback.upsert({
      where: {
        scriptId_hookIndex: {
          scriptId: script.id,
          hookIndex: body.hookIndex,
        },
      },
      create: {
        userId: user.id,
        scriptId: script.id,
        hookIndex: body.hookIndex,
        outcome: body.outcome!,
      },
      update: { outcome: body.outcome! },
    });

    return NextResponse.json({ ok: true, feedback: row });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/hooks/feedback", error);
    return NextResponse.json(
      { error: "Не удалось сохранить оценку" },
      { status: 500 },
    );
  }
}
