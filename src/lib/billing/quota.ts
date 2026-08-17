import { AnalysisStatus, SubscriptionPlan, type User } from "@prisma/client";

import { PLANS } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { hasPaidAccess } from "@/lib/users";

export class QuotaError extends Error {
  readonly statusCode = 402;
  readonly packsUsed: number;
  readonly packsLimit: number;
  readonly planName: string;

  constructor(input: { packsUsed: number; packsLimit: number; planName: string }) {
    super(
      `В этом месяце лимит тарифа «${input.planName}» исчерпан (${input.packsUsed} из ${input.packsLimit} разборов). ${
        input.planName === "Бесплатно"
          ? "Откройте Старт, чтобы собрать ещё сценарии."
          : "Откройте Про или дождитесь следующего месяца."
      }`,
    );
    this.name = "QuotaError";
    this.packsUsed = input.packsUsed;
    this.packsLimit = input.packsLimit;
    this.planName = input.planName;
  }
}

export function effectivePlan(user: Pick<User, "subscriptionPlan" | "subscriptionExpiresAt">) {
  return hasPaidAccess(user) ? user.subscriptionPlan : SubscriptionPlan.FREE;
}

export function monthWindow(now = new Date()) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { from, to };
}

export async function countCompletedPacksThisMonth(userId: string, now = new Date()) {
  const { from, to } = monthWindow(now);
  return prisma.profileAnalysis.count({
    where: {
      userId,
      status: { in: [AnalysisStatus.COMPLETED, AnalysisStatus.NEEDS_FACTS] },
      createdAt: { gte: from, lt: to },
    },
  });
}

export async function getQuotaSnapshot(
  user: Pick<User, "id" | "subscriptionPlan" | "subscriptionExpiresAt">,
  now = new Date(),
) {
  const planId = effectivePlan(user);
  const plan = PLANS[planId];
  const packsUsed = await countCompletedPacksThisMonth(user.id, now);
  return {
    planId,
    planName: plan.name,
    packsUsed,
    packsLimit: plan.packsPerMonth,
    packsRemaining: Math.max(0, plan.packsPerMonth - packsUsed),
    scriptsLimit: plan.scriptsPerMonth,
  };
}

export async function assertAnalysisQuota(
  user: Pick<User, "id" | "subscriptionPlan" | "subscriptionExpiresAt">,
) {
  const snapshot = await getQuotaSnapshot(user);
  if (snapshot.packsUsed >= snapshot.packsLimit) {
    throw new QuotaError(snapshot);
  }
  return snapshot;
}
