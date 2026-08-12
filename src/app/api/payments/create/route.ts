import { PaymentProvider, PaymentStatus, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { PLANS } from "@/lib/config";
import { fulfillSuccessfulPayment } from "@/lib/payments/fulfill";
import { computeReferralCredit } from "@/lib/payments/referral-credit";
import { createYooKassaPayment } from "@/lib/payments/yookassa";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  plan: z.enum(["START", "PRO", "AGENCY"]),
  applyCredit: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await requireUser(request, body.userId);
    await assertRateLimit({
      name: "payments",
      id: user.id,
      max: 20,
      windowSec: 3600,
    });

    const planPrice = PLANS[body.plan].priceRub;
    const applyCredit = body.applyCredit !== false;
    const balance = Number(user.referralBalance);
    const split = applyCredit
      ? computeReferralCredit(planPrice, balance)
      : { credit: 0, charge: planPrice, fullyCovered: false };

    let reservedCredit = 0;
    if (split.credit > 0) {
      const reserved = await prisma.user.updateMany({
        where: { id: user.id, referralBalance: { gte: split.credit } },
        data: { referralBalance: { decrement: split.credit } },
      });
      if (reserved.count === 0) {
        split.credit = 0;
        split.charge = planPrice;
        split.fullyCovered = false;
      } else {
        reservedCredit = split.credit;
      }
    }

    try {
      if (split.fullyCovered) {
        const dbPayment = await prisma.payment.create({
          data: {
            userId: user.id,
            amount: 0,
            currency: "RUB",
            plan: body.plan as SubscriptionPlan,
            status: PaymentStatus.PENDING,
            provider: PaymentProvider.YOOKASSA,
            providerPaymentId: `balance_${crypto.randomUUID()}`,
            metadata: {
              mocked: false,
              paidFromBalance: true,
              creditApplied: split.credit,
            },
          },
        });
        await fulfillSuccessfulPayment(dbPayment);
        reservedCredit = 0;
        return NextResponse.json(
          serialize({
            payment: { ...dbPayment, status: PaymentStatus.SUCCEEDED },
            paidFromBalance: true,
            creditApplied: split.credit,
            charge: 0,
          }),
        );
      }

      const { payment, mocked } = await createYooKassaPayment({
        plan: body.plan,
        userId: user.id,
        telegramId: user.telegramId.toString(),
        amountRub: split.charge,
        creditApplied: split.credit,
      });

      const dbPayment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: split.charge,
          currency: "RUB",
          plan: body.plan as SubscriptionPlan,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.YOOKASSA,
          providerPaymentId: payment.id,
          metadata: {
            mocked,
            confirmationUrl: payment.confirmation?.confirmation_url || null,
            creditApplied: split.credit,
            planPrice,
          },
        },
      });
      reservedCredit = 0;

      return NextResponse.json(
        serialize({
          payment: dbPayment,
          confirmationUrl: payment.confirmation?.confirmation_url,
          mocked,
          creditApplied: split.credit,
          charge: split.charge,
          paidFromBalance: false,
        }),
      );
    } catch (inner) {
      if (reservedCredit > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { referralBalance: { increment: reservedCredit } },
        });
      }
      throw inner;
    }
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    const status = (error as { status?: number }).status === 429 ? 429 : 400;
    console.error("POST /api/payments/create", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось создать платёж",
      },
      { status },
    );
  }
}
