import { NextResponse } from "next/server";
import { z } from "zod";

import { serialize } from "@/lib/serialize";
import { upsertTelegramUser } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { referralLink } from "@/lib/config";

const bodySchema = z.object({
  telegramId: z.union([z.string(), z.number()]),
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
    const user = await upsertTelegramUser(body);
    const latestAnalysis = await prisma.profileAnalysis.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { scripts: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json(
      serialize({
        user,
        latestAnalysis,
        referralLink: referralLink(user.telegramId.toString()),
      }),
    );
  } catch (error) {
    console.error("POST /api/users", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upsert user",
      },
      { status: 400 },
    );
  }
}
