import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, publicAnalysis, requireUser } from "@/lib/api-auth";
import { HonestyError, assertCanAnalyzeProfile } from "@/lib/honesty";
import { enqueueAnalysis } from "@/lib/queue/analysis-queue";
import { prisma } from "@/lib/prisma";
import { refundQuota } from "@/lib/quota-lock";
import { assertRateLimit, httpErrorStatus } from "@/lib/rate-limit";
import { serialize } from "@/lib/serialize";
import { assertCanEnqueueAnalysis, QuotaError } from "@/lib/usage";

const bodySchema = z.object({
  userId: z.string().min(1),
  clientAccountId: z.string().optional(),
});

export async function POST(request: Request) {
  let consumedUserId: string | null = null;
  try {
    const body = bodySchema.parse(await request.json());
    const user = await requireUser(request, body.userId);
    await assertRateLimit({
      name: "analyze",
      id: user.id,
      max: 12,
      windowSec: 3600,
    });

    if (!body.clientAccountId && user.platform) {
      assertCanAnalyzeProfile(user.platform);
    }

    await assertCanEnqueueAnalysis(user);
    consumedUserId = user.id;

    let socialHandle = user.socialHandle;
    let platform = user.platform;

    if (body.clientAccountId) {
      const client = await prisma.clientAccount.findFirst({
        where: { id: body.clientAccountId, agencyUserId: user.id },
      });
      if (!client) {
        await refundQuota(user.id, "analyses");
        consumedUserId = null;
        return NextResponse.json(
          { error: "Клиентский аккаунт не найден" },
          { status: 404 },
        );
      }
      socialHandle = client.socialHandle;
      platform = client.platform;
    }

    if (!socialHandle || !platform) {
      await refundQuota(user.id, "analyses");
      consumedUserId = null;
      return NextResponse.json(
        { error: "Сначала завершите онбординг (укажите @username)" },
        { status: 400 },
      );
    }

    try {
      assertCanAnalyzeProfile(platform);
    } catch (honestyError) {
      await refundQuota(user.id, "analyses");
      consumedUserId = null;
      throw honestyError;
    }

    const queued = await enqueueAnalysis({
      userId: user.id,
      socialHandle,
      platform,
      clientAccountId: body.clientAccountId,
    });
    consumedUserId = null;

    const analysis = await prisma.profileAnalysis.findUniqueOrThrow({
      where: { id: queued.analysisId },
      include: { scripts: true },
    });

    return NextResponse.json(
      serialize({
        analysis: publicAnalysis(analysis),
        queued: true,
        jobId: queued.jobId,
        queueMode: queued.mode,
      }),
    );
  } catch (error) {
    if (consumedUserId) {
      await refundQuota(consumedUserId, "analyses").catch(() => undefined);
    }
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/analyze", error);
    const status =
      error instanceof HonestyError
        ? error.status
        : error instanceof QuotaError
          ? 402
          : httpErrorStatus(error, 500);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось поставить анализ в очередь",
        code:
          error instanceof HonestyError
            ? error.code
            : error instanceof QuotaError
              ? error.code
              : undefined,
      },
      { status },
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const userId = url.searchParams.get("userId");
    const user = await requireUser(request, userId);

    if (!id) {
      const analyses = await prisma.profileAnalysis.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          socialHandle: true,
          platform: true,
          niche: true,
          createdAt: true,
        },
      });
      return NextResponse.json(serialize({ analyses }));
    }

    const analysis = await prisma.profileAnalysis.findUnique({
      where: { id },
      include: { scripts: { orderBy: { createdAt: "asc" } } },
    });

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    return NextResponse.json(
      serialize({
        analysis: publicAnalysis(analysis),
      }),
    );
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
}
