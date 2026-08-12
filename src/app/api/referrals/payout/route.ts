import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { REFERRAL_MIN_PAYOUT_RUB } from "@/lib/payments/referral-credit";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  requisites: z.string().min(8).max(200),
});

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId");
    const user = await requireUser(request, userId);
    const payouts = await prisma.referralPayout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(
      serialize({
        balance: user.referralBalance,
        minPayout: REFERRAL_MIN_PAYOUT_RUB,
        payouts,
      }),
    );
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    return NextResponse.json({ error: "Не удалось загрузить баланс" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await requireUser(request, body.userId);
    await assertRateLimit({
      name: "payout",
      id: user.id,
      max: 8,
      windowSec: 3600,
    });
    const amount = Math.round(body.amount * 100) / 100;
    if (amount < REFERRAL_MIN_PAYOUT_RUB) {
      return NextResponse.json(
        { error: `Минимальный вывод — ${REFERRAL_MIN_PAYOUT_RUB} ₽` },
        { status: 400 },
      );
    }

    const payout = await prisma.$transaction(async (tx) => {
      const reserved = await tx.user.updateMany({
        where: { id: user.id, referralBalance: { gte: amount } },
        data: { referralBalance: { decrement: amount } },
      });
      if (reserved.count === 0) {
        throw new Error("Недостаточно средств на реферальном балансе");
      }
      return tx.referralPayout.create({
        data: {
          userId: user.id,
          amount,
          requisites: body.requisites.trim(),
          status: "PENDING",
        },
      });
    });

    return NextResponse.json(serialize({ payout, balance: Number(user.referralBalance) - amount }));
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    const status = (error as { status?: number }).status === 429 ? 429 : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось создать заявку",
      },
      { status },
    );
  }
}
