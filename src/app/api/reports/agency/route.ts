import { NextResponse } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/bot";

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      sendTelegram?: boolean;
    };
    const user = await requireUser(request, body.userId);
    if (user.subscriptionPlan !== "AGENCY") {
      return NextResponse.json(
        { error: "Отчёт доступен на тарифе Агентство" },
        { status: 403 },
      );
    }

    const since = weekAgo();
    const clients = await prisma.clientAccount.findMany({
      where: { agencyUserId: user.id },
      include: {
        analyses: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            scripts: {
              select: { id: true, title: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 3,
            },
          },
        },
      },
    });

    const scriptsCount = await prisma.script.count({
      where: { userId: user.id, createdAt: { gte: since } },
    });

    const lines: string[] = [
      "ReelsFactory — отчёт за 7 дней",
      `Клиентов: ${clients.length}`,
      `Сценариев: ${scriptsCount}`,
      "",
    ];

    for (const client of clients) {
      const clientScripts = client.analyses.flatMap((a) => a.scripts);
      const last = client.analyses[0];
      lines.push(`• ${client.label || client.socialHandle} (@${client.socialHandle})`);
      lines.push(
        `  анализов: ${client.analyses.length}, сценариев: ${clientScripts.length}`,
      );
      if (last?.niche) lines.push(`  ниша: ${last.niche}`);
      if (clientScripts[0]) {
        lines.push(`  последний сценарий: ${clientScripts[0].title}`);
      }
      lines.push("");
    }

    const report = lines.join("\n").trim();

    if (body.sendTelegram) {
      await sendTelegramMessage(user.telegramId, report);
    }

    return NextResponse.json({
      report,
      clients: clients.length,
      scripts: scriptsCount,
    });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/reports/agency", error);
    return NextResponse.json(
      { error: "Не удалось собрать отчёт" },
      { status: 500 },
    );
  }
}
