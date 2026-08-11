import { PaymentProvider, PaymentStatus, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PLANS } from "@/lib/config";
import { createYooKassaPayment } from "@/lib/payments/yookassa";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  plan: z.enum(["START", "PRO", "AGENCY"]),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const { payment, mocked } = await createYooKassaPayment({
      plan: body.plan,
      userId: user.id,
      telegramId: user.telegramId.toString(),
    });

    const dbPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: PLANS[body.plan].priceRub,
        currency: "RUB",
        plan: body.plan as SubscriptionPlan,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.YOOKASSA,
        providerPaymentId: payment.id,
        metadata: {
          mocked,
          confirmationUrl: payment.confirmation?.confirmation_url || null,
        },
      },
    });

    return NextResponse.json(
      serialize({
        payment: dbPayment,
        confirmationUrl: payment.confirmation?.confirmation_url,
        mocked,
      }),
    );
  } catch (error) {
    console.error("POST /api/payments/create", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось создать платёж",
      },
      { status: 400 },
    );
  }
}
