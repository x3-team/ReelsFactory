import { PaymentProvider, PaymentStatus, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { planPriceRub, SCRIPT_PACK } from "@/lib/config";
import {
  createYooKassaPayment,
  createYooKassaProductPayment,
} from "@/lib/payments/yookassa";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  product: z.enum(["subscription", "SCRIPT_PACK"]).default("subscription"),
  plan: z.enum(["START", "PRO", "AGENCY"]).optional(),
  billingPeriod: z.enum(["month", "year"]).default("month"),
  analysisId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (body.product === "SCRIPT_PACK") {
      const { payment, mocked } = await createYooKassaProductPayment({
        productId: "SCRIPT_PACK",
        title: SCRIPT_PACK.name,
        amountRub: SCRIPT_PACK.priceRub,
        userId: user.id,
        telegramId: user.telegramId.toString(),
        extraMeta: { analysisId: body.analysisId || "" },
      });

      const dbPayment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: SCRIPT_PACK.priceRub,
          currency: "RUB",
          plan: SubscriptionPlan.FREE,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.YOOKASSA,
          providerPaymentId: payment.id,
          metadata: {
            mocked,
            product: "SCRIPT_PACK",
            analysisId: body.analysisId || null,
            confirmationUrl: payment.confirmation?.confirmation_url || null,
          },
        },
      });

      return NextResponse.json(
        serialize({
          payment: dbPayment,
          confirmationUrl: payment.confirmation?.confirmation_url,
          mocked,
          product: "SCRIPT_PACK",
        }),
      );
    }

    if (!body.plan) {
      return NextResponse.json({ error: "Укажи тариф" }, { status: 400 });
    }

    const amount = planPriceRub(body.plan, body.billingPeriod);
    const { payment, mocked } = await createYooKassaPayment({
      plan: body.plan,
      billingPeriod: body.billingPeriod,
      userId: user.id,
      telegramId: user.telegramId.toString(),
    });

    const dbPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        currency: "RUB",
        plan: body.plan as SubscriptionPlan,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.YOOKASSA,
        providerPaymentId: payment.id,
        metadata: {
          mocked,
          product: "subscription",
          billingPeriod: body.billingPeriod,
          confirmationUrl: payment.confirmation?.confirmation_url || null,
        },
      },
    });

    return NextResponse.json(
      serialize({
        payment: dbPayment,
        confirmationUrl: payment.confirmation?.confirmation_url,
        mocked,
        billingPeriod: body.billingPeriod,
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
