import { prisma } from "@/lib/prisma";
import { monthWindow } from "@/lib/usage";

export type CostKind = "apify" | "whisper" | "llm";

export async function recordCostEvent(
  kind: CostKind,
  userId?: string | null,
  meta?: string,
) {
  try {
    await prisma.costEvent.create({
      data: { kind, userId: userId || null, meta: meta || null },
    });
  } catch (error) {
    console.warn("cost event skipped", error instanceof Error ? error.message : error);
  }
}

export async function countCostEventsThisMonth(kind: CostKind) {
  try {
    const { start, end } = monthWindow();
    return prisma.costEvent.count({
      where: { kind, createdAt: { gte: start, lt: end } },
    });
  } catch (error) {
    console.warn("cost count skipped", error instanceof Error ? error.message : error);
    return 0;
  }
}

export function apifyMonthlyCap() {
  return Number(process.env.APIFY_MONTHLY_CAP || 200);
}

export async function canRunApify() {
  const cap = apifyMonthlyCap();
  if (cap <= 0) return false;
  const used = await countCostEventsThisMonth("apify");
  return used < cap;
}
