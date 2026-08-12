import { PaymentStatus, type Payment } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  ReferralStatus,
  SubscriptionPlan,
} from "@prisma/client";

import {
  REFERRAL_FIRST_COMMISSION_RATE,
  REFERRAL_RENEWAL_COMMISSION_RATE,
} from "@/lib/config";
import { prisma } from "@/lib/prisma";

export async function fulfillSuccessfulPayment(payment: Payment) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.SUCCEEDED },
    });
    if (claimed.count === 0) {
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      return { payment: current, alreadyFulfilled: true as const };
    }

    const updatedPayment = await tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });

    const user = await tx.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionPlan: payment.plan,
        subscriptionExpiresAt: expiresAt,
      },
    });

    if (user.referrerId && payment.plan !== SubscriptionPlan.FREE) {
      const priorPaid = await tx.payment.count({
        where: {
          userId: user.id,
          status: PaymentStatus.SUCCEEDED,
          id: { not: payment.id },
        },
      });
      const isRenewal = priorPaid > 0;
      const rate = isRenewal
        ? REFERRAL_RENEWAL_COMMISSION_RATE
        : REFERRAL_FIRST_COMMISSION_RATE;
      const credit = new Decimal(payment.amount.toString()).mul(rate);

      await tx.user.update({
        where: { id: user.referrerId },
        data: { referralBalance: { increment: credit } },
      });

      await tx.referral.create({
        data: {
          referrerId: user.referrerId,
          referredId: user.id,
          paymentId: payment.id,
          creditAmount: credit,
          commissionRate: rate,
          isRenewal,
          status: ReferralStatus.CREDITED,
        },
      });
    }

    return { payment: updatedPayment, alreadyFulfilled: false as const };
  });

  return result;
}
