import { NextResponse } from "next/server";

import { resolveHonesty } from "@/lib/honesty";
import { MIN_SUBMITTED_REELS } from "@/lib/submitted-reels";
import { prisma } from "@/lib/prisma";
import { pingRedis, redisUrl } from "@/lib/queue/analysis-queue";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  let postgres = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    postgres = true;
  } catch {
    postgres = false;
  }

  const redis = await pingRedis();
  const production = process.env.NODE_ENV === "production";
  const queueOk = redis.ok || (!production && !redisUrl());
  const honesty = resolveHonesty();
  const ok = postgres && (queueOk || process.env.ALLOW_MEMORY_QUEUE === "true");

  return NextResponse.json(
    {
      ok,
      version: APP_VERSION,
      postgres,
      redis: redis.configured ? (redis.ok ? "up" : "down") : "unconfigured",
      queue: redis.ok ? "bullmq" : "memory",
      honesty: {
        mode: honesty.mode,
        scrape: honesty.scrape,
        ai: honesty.ai,
        payments: honesty.payments,
        allowMockProfile: honesty.allowMockProfile,
        warning: honesty.warning,
        needsUserReels: !honesty.scrape,
        minSubmittedReels: MIN_SUBMITTED_REELS,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
