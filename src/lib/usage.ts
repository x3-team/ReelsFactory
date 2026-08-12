import type { User } from "@prisma/client";

import { planLimits } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { hasPaidAccess } from "@/lib/users";

export function monthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function getMonthlyUsage(userId: string) {
  const { start, end } = monthWindow();
  const createdAt = { gte: start, lt: end };

  const [scripts, remakes, autopsies, analyses] = await Promise.all([
    prisma.script.count({ where: { userId, createdAt } }),
    prisma.script.count({
      where: { userId, createdAt, sourceType: "remake" },
    }),
    prisma.script.count({
      where: { userId, createdAt, sourceType: "autopsy" },
    }),
    prisma.profileAnalysis.count({
      where: {
        userId,
        createdAt,
        status: { in: ["QUEUED", "SCRAPING", "TRANSCRIBING", "GENERATING", "COMPLETED"] },
      },
    }),
  ]);

  return { scripts, remakes, autopsies, analyses, windowStart: start };
}

export async function getUsageSnapshot(user: User) {
  const paid = hasPaidAccess(user);
  const planId = paid ? user.subscriptionPlan : "FREE";
  const limits = planLimits(planId);
  const usage = await getMonthlyUsage(user.id);

  return {
    planId,
    limits: {
      scriptsPerMonth: limits.scriptsPerMonth,
      analysesPerMonth: limits.analysesPerMonth,
      remakesPerMonth: limits.remakesPerMonth,
      autopsiesPerMonth: limits.autopsiesPerMonth,
      maxClientAccounts: limits.maxClientAccounts,
    },
    usage,
    remaining: {
      scripts: Math.max(0, limits.scriptsPerMonth - usage.scripts),
      analyses: Math.max(0, limits.analysesPerMonth - usage.analyses),
      remakes: Math.max(0, limits.remakesPerMonth - usage.remakes),
      autopsies: Math.max(0, limits.autopsiesPerMonth - usage.autopsies),
    },
  };
}

export class QuotaError extends Error {
  code = "QUOTA_EXCEEDED" as const;
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

export async function assertCanEnqueueAnalysis(user: User) {
  const snap = await getUsageSnapshot(user);
  if (snap.remaining.analyses <= 0) {
    throw new QuotaError(
      `Лимит анализов на месяц исчерпан (${snap.limits.analysesPerMonth}). Обновите тариф или подождите следующий месяц.`,
    );
  }
  return snap;
}

export async function assertCanCreateScripts(user: User, count: number) {
  const snap = await getUsageSnapshot(user);
  if (snap.remaining.scripts < count) {
    throw new QuotaError(
      `Лимит сценариев: осталось ${snap.remaining.scripts} из ${snap.limits.scriptsPerMonth}. Ремейк и разборы тоже считаются в квоту.`,
    );
  }
  return snap;
}

export async function assertCanRemake(user: User) {
  const snap = await getUsageSnapshot(user);
  if (snap.limits.remakesPerMonth <= 0) {
    throw new QuotaError(
      "Ремейк доступен на тарифах Про и Агентство",
    );
  }
  if (snap.remaining.remakes <= 0) {
    throw new QuotaError(
      `Лимит ремейков на месяц: ${snap.limits.remakesPerMonth}.`,
    );
  }
  if (snap.remaining.scripts <= 0) {
    throw new QuotaError(
      `Лимит сценариев исчерпан (${snap.limits.scriptsPerMonth}/мес). Ремейк списывается из этой квоты.`,
    );
  }
  return snap;
}

export async function assertCanAutopsy(user: User) {
  const snap = await getUsageSnapshot(user);
  if (snap.limits.autopsiesPerMonth <= 0) {
    throw new QuotaError(
      "Разбор «не залетело» доступен на тарифах Про и Агентство",
    );
  }
  if (snap.remaining.autopsies <= 0) {
    throw new QuotaError(
      `Лимит разборов на месяц: ${snap.limits.autopsiesPerMonth}.`,
    );
  }
  if (snap.remaining.scripts <= 0) {
    throw new QuotaError(
      `Лимит сценариев исчерпан (${snap.limits.scriptsPerMonth}/мес). Разбор списывается из этой квоты.`,
    );
  }
  return snap;
}
