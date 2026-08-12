import { NextResponse } from "next/server";
import { z } from "zod";

import { enqueueAnalysis } from "@/lib/queue/analysis-queue";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { assertCanEnqueueAnalysis, QuotaError } from "@/lib/usage";

const bodySchema = z.object({
  userId: z.string().min(1),
  clientAccountId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    await assertCanEnqueueAnalysis(user);

    let socialHandle = user.socialHandle;
    let platform = user.platform;

    if (body.clientAccountId) {
      const client = await prisma.clientAccount.findFirst({
        where: { id: body.clientAccountId, agencyUserId: user.id },
      });
      if (!client) {
        return NextResponse.json(
          { error: "Клиентский аккаунт не найден" },
          { status: 404 },
        );
      }
      socialHandle = client.socialHandle;
      platform = client.platform;
    }

    if (!socialHandle || !platform) {
      return NextResponse.json(
        { error: "Сначала завершите онбординг (укажите @username)" },
        { status: 400 },
      );
    }

    const queued = await enqueueAnalysis({
      userId: user.id,
      socialHandle,
      platform,
      clientAccountId: body.clientAccountId,
    });

    const analysis = await prisma.profileAnalysis.findUniqueOrThrow({
      where: { id: queued.analysisId },
      include: { scripts: true },
    });

    return NextResponse.json(
      serialize({
        analysis,
        queued: true,
        jobId: queued.jobId,
        queueMode: queued.mode,
      }),
    );
  } catch (error) {
    console.error("POST /api/analyze", error);
    const status = error instanceof QuotaError ? 402 : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось поставить анализ в очередь",
        code: error instanceof QuotaError ? error.code : undefined,
      },
      { status },
    );
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  const analysis = await prisma.profileAnalysis.findUnique({
    where: { id },
    include: { scripts: { orderBy: { createdAt: "asc" } } },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  return NextResponse.json(serialize({ analysis }));
}
