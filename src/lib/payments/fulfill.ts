import {
  PaymentStatus,
  ReferralStatus,
  SubscriptionPlan,
  type Payment,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import {
  billingPeriodDays,
  REFERRAL_FIRST_COMMISSION_RATE,
  REFERRAL_RENEWAL_COMMISSION_RATE,
  type BillingPeriod,
} from "@/lib/config";
import { prisma } from "@/lib/prisma";

export async function fulfillSuccessfulPayment(payment: Payment) {
  if (payment.status === PaymentStatus.SUCCEEDED) {
    return { payment, alreadyFulfilled: true as const };
  }

  const meta = (payment.metadata || {}) as { billingPeriod?: string };
  const period: BillingPeriod =
    meta.billingPeriod === "year" ? "year" : "month";
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + billingPeriodDays(period));

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

    return updatedPayment;
  });

  return { payment: result, alreadyFulfilled: false as const };
}
