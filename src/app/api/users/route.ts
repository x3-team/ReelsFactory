import { NextResponse } from "next/server";
import { z } from "zod";

import { referralLink } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { resolveTelegramAuth } from "@/lib/telegram/auth";
import { upsertTelegramUser } from "@/lib/users";

const bodySchema = z.object({
  initData: z.string().nullish(),
  telegramId: z.union([z.string(), z.number()]).optional(),
  username: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  languageCode: z.string().nullish(),
  photoUrl: z.string().nullish(),
  startParam: z.string().nullish(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const auth = resolveTelegramAuth(body);
    const user = await upsertTelegramUser(auth);
    const latestAnalysis = await prisma.profileAnalysis.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { scripts: { orderBy: { createdAt: "asc" } } },
    });
    const previousAnalysis = await prisma.profileAnalysis.findFirst({
      where: {
        userId: user.id,
        status: "COMPLETED",
        ...(latestAnalysis ? { id: { not: latestAnalysis.id } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        niche: true,
        targetAudience: true,
        contentPillars: true,
        profileAuditTips: true,
        createdAt: true,
      },
    });
    const analyses = await prisma.profileAnalysis.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        socialHandle: true,
        platform: true,
        niche: true,
        createdAt: true,
        status: true,
      },
    });
    const clientAccounts = await prisma.clientAccount.findMany({
      where: { agencyUserId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      serialize({
        user,
        latestAnalysis,
        previousAnalysis,
        analyses,
        clientAccounts,
        referralLink: referralLink(user.telegramId.toString()),
        authVerified: auth.verified,
      }),
    );
  } catch (error) {
    console.error("POST /api/users", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось сохранить пользователя",
      },
      { status: 400 },
    );
  }
}
