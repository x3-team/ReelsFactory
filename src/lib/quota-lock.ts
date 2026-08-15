import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class QuotaError extends Error {
  code = "QUOTA_EXCEEDED" as const;
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

export type QuotaKind = "analyses" | "scripts" | "remakes" | "autopsies";

export function utcYearMonth(now = new Date()) {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

/**
 * First touch of the month copies live row counts so pre-counter usage
 * cannot be bypassed, and failed jobs that never created rows stay honest.
 */
async function seedCounterIfMissing(userId: string, year: number, month: number) {
  const { start, end } = monthBounds(year, month);
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "UsageCounter" ("id", "userId", "year", "month", "analyses", "scripts", "remakes", "autopsies", "updatedAt")
    SELECT
      ${id},
      ${userId},
      ${year},
      ${month},
      (
        SELECT COUNT(*)::int FROM "ProfileAnalysis"
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
          AND "status" IN ('QUEUED', 'SCRAPING', 'TRANSCRIBING', 'GENERATING', 'COMPLETED')
      ),
      (
        SELECT COUNT(*)::int FROM "Script"
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
      ),
      (
        SELECT COUNT(*)::int FROM "Script"
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
          AND "sourceType" = 'remake'
      ),
      (
        SELECT COUNT(*)::int FROM "Script"
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
          AND "sourceType" = 'autopsy'
      ),
      NOW()
    ON CONFLICT ("userId", "year", "month") DO NOTHING
  `);
}

/**
 * Atomically increment a monthly counter if it is still below `limit`.
 * Two parallel requests cannot both pass the WHERE … RETURNING gate.
 */
export async function consumeQuota(
  userId: string,
  kind: QuotaKind,
  limit: number,
  extra?: { scriptLimit?: number },
) {
  if (limit <= 0) {
    throw new QuotaError("Недоступно на текущем тарифе");
  }

  const { year, month } = utcYearMonth();
  const scriptLimit = extra?.scriptLimit ?? 1_000_000;
  await seedCounterIfMissing(userId, year, month);

  const setClause =
    kind === "analyses"
      ? Prisma.sql`"analyses" = "analyses" + 1`
      : kind === "scripts"
        ? Prisma.sql`"scripts" = "scripts" + 1`
        : kind === "remakes"
          ? Prisma.sql`"remakes" = "remakes" + 1, "scripts" = "scripts" + 1`
          : Prisma.sql`"autopsies" = "autopsies" + 1, "scripts" = "scripts" + 1`;

  const whereKind =
    kind === "analyses"
      ? Prisma.sql`"analyses" < ${limit}`
      : kind === "scripts"
        ? Prisma.sql`"scripts" < ${limit}`
        : kind === "remakes"
          ? Prisma.sql`"remakes" < ${limit} AND "scripts" < ${scriptLimit}`
          : Prisma.sql`"autopsies" < ${limit} AND "scripts" < ${scriptLimit}`;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "UsageCounter"
    SET ${setClause}, "updatedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "year" = ${year}
      AND "month" = ${month}
      AND ${whereKind}
    RETURNING "id"
  `);

  if (!rows[0]) {
    throw new QuotaError("Лимит на месяц исчерпан");
  }
}

export async function refundQuota(userId: string, kind: QuotaKind) {
  const { year, month } = utcYearMonth();
  const setClause =
    kind === "analyses"
      ? Prisma.sql`"analyses" = GREATEST("analyses" - 1, 0)`
      : kind === "scripts"
        ? Prisma.sql`"scripts" = GREATEST("scripts" - 1, 0)`
        : kind === "remakes"
          ? Prisma.sql`"remakes" = GREATEST("remakes" - 1, 0), "scripts" = GREATEST("scripts" - 1, 0)`
          : Prisma.sql`"autopsies" = GREATEST("autopsies" - 1, 0), "scripts" = GREATEST("scripts" - 1, 0)`;

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "UsageCounter"
    SET ${setClause}, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "year" = ${year} AND "month" = ${month}
  `);
}
