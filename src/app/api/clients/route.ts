import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PLANS } from "@/lib/config";
import { detectPlatform, normalizeHandle } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { hasPaidAccess } from "@/lib/users";

const createSchema = z.object({
  userId: z.string().min(1),
  socialHandle: z.string().min(2),
  label: z.string().max(80).optional(),
});

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }
  const accounts = await prisma.clientAccount.findMany({
    where: { agencyUserId: userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(serialize({ accounts }));
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    if (
      !hasPaidAccess(user) ||
      user.subscriptionPlan !== SubscriptionPlan.AGENCY
    ) {
      return NextResponse.json(
        { error: "Клиентские аккаунты доступны на тарифе Агентство" },
        { status: 403 },
      );
    }

    const max = PLANS.AGENCY.maxClientAccounts;
    const count = await prisma.clientAccount.count({
      where: { agencyUserId: user.id },
    });
    if (count >= max) {
      return NextResponse.json(
        { error: `Лимит тарифа Агентство: ${max} аккаунтов` },
        { status: 400 },
      );
    }

    const platform = detectPlatform(body.socialHandle);
    const handle = normalizeHandle(body.socialHandle, platform);
    const account = await prisma.clientAccount.create({
      data: {
        agencyUserId: user.id,
        socialHandle: handle,
        platform,
        label: body.label || handle,
      },
    });

    return NextResponse.json(serialize({ account }));
  } catch (error) {
    console.error("POST /api/clients", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось добавить аккаунт",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const id = searchParams.get("id");
  if (!userId || !id) {
    return NextResponse.json(
      { error: "userId и id обязательны" },
      { status: 400 },
    );
  }

  await prisma.clientAccount.deleteMany({
    where: { id, agencyUserId: userId },
  });
  return NextResponse.json({ ok: true });
}
