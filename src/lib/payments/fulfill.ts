import {
  PaymentStatus,
  ReferralStatus,
  SubscriptionPlan,
  type Payment,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { REFERRAL_COMMISSION_RATE } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export async function fulfillSuccessfulPayment(payment: Payment) {
  if (payment.status === PaymentStatus.SUCCEEDED) {
    return { payment, alreadyFulfilled: true as const };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    const user = await tx.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionPlan: payment.plan,
        subscriptionExpiresAt: expiresAt,
      },
    });

    if (user.referrerId && payment.plan !== SubscriptionPlan.FREE) {
      const credit = new Decimal(payment.amount.toString()).mul(
        REFERRAL_COMMISSION_RATE,
      );

      await tx.user.update({
        where: { id: user.referrerId },
        data: { referralBalance: { increment: credit } },
      });

      await tx.referral.upsert({
        where: {
          referrerId_referredId: {
            referrerId: user.referrerId,
            referredId: user.id,
          },
        },
        create: {
          referrerId: user.referrerId,
          referredId: user.id,
          paymentId: payment.id,
          creditAmount: credit,
          status: ReferralStatus.CREDITED,
        },
        update: {
          paymentId: payment.id,
          creditAmount: credit,
          status: ReferralStatus.CREDITED,
        },
      });
    }

    return updatedPayment;
  });

  return { payment: result, alreadyFulfilled: false as const };
}
