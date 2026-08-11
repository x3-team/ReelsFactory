import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

/**
 * Напоминания для бота (polling).
 * После разбора планируем «сними сценарий 2» через 2 дня.
 */
const scheduleSchema = z.object({
  userId: z.string().min(1),
  analysisId: z.string().min(1),
  days: z.number().int().min(1).max(14).default(2),
});

export async function POST(request: Request) {
  try {
    const body = scheduleSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + body.days);

    // Храним в metadata последнего платежа нельзя — пишем в rawProfileData analysis? 
    // Проще: отдельная таблица нет → используем User.updatedAt hack через prisma.$executeRaw? 
    // Store reminders as JSON file-less: ProfileAnalysis.errorMessage no.
    // Use Payment metadata pattern on a lightweight approach:
    // Store in analysis.rawProfileData._reminders

    const analysis = await prisma.profileAnalysis.findFirst({
      where: { id: body.analysisId, userId: body.userId },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const raw = (analysis.rawProfileData || {}) as Record<string, unknown>;
    const reminders = Array.isArray(raw.reminders) ? [...raw.reminders] : [];
    reminders.push({
      type: "shoot_script_2",
      dueAt: dueAt.toISOString(),
      sent: false,
      text: "Пора снять сценарий 2 из разбора ReelsFactory — он уже готов в миниаппе.",
    });

    await prisma.profileAnalysis.update({
      where: { id: analysis.id },
      data: { rawProfileData: { ...raw, reminders } as object },
    });

    return NextResponse.json(
      serialize({ ok: true, dueAt: dueAt.toISOString() }),
    );
  } catch (error) {
    console.error("POST /api/reminders", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 },
    );
  }
}

/** Бот забирает due-напоминания */
export async function GET() {
  try {
    const analyses = await prisma.profileAnalysis.findMany({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { telegramId: true, id: true, username: true } } },
    });

    const now = Date.now();
    const due: Array<{
      userId: string;
      telegramId: string;
      analysisId: string;
      text: string;
      dueAt: string;
    }> = [];

    for (const analysis of analyses) {
      const raw = (analysis.rawProfileData || {}) as {
        reminders?: Array<{
          type: string;
          dueAt: string;
          sent?: boolean;
          text: string;
        }>;
      };
      if (!raw.reminders?.length) continue;
      let changed = false;
      for (const reminder of raw.reminders) {
        if (reminder.sent) continue;
        if (new Date(reminder.dueAt).getTime() > now) continue;
        due.push({
          userId: analysis.userId,
          telegramId: analysis.user.telegramId.toString(),
          analysisId: analysis.id,
          text: reminder.text,
          dueAt: reminder.dueAt,
        });
        reminder.sent = true;
        changed = true;
      }
      if (changed) {
        await prisma.profileAnalysis.update({
          where: { id: analysis.id },
          data: { rawProfileData: raw as object },
        });
      }
    }

    return NextResponse.json(serialize({ due }));
  } catch (error) {
    console.error("GET /api/reminders", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
