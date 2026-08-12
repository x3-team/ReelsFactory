import { NextResponse } from "next/server";
import { z } from "zod";

import { referralLink } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { resolveTelegramAuth } from "@/lib/telegram/auth";
import { upsertTelegramUser } from "@/lib/users";
import { getUsageSnapshot } from "@/lib/usage";

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
    const clientAccounts = await prisma.clientAccount.findMany({
      where: { agencyUserId: user.id },
      orderBy: { createdAt: "asc" },
    });
    const usage = await getUsageSnapshot(user);

    return NextResponse.json(
      serialize({
        user,
        latestAnalysis,
        clientAccounts,
        referralLink: referralLink(user.telegramId.toString()),
        authVerified: auth.verified,
        usage,
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
