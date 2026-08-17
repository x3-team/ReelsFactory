import { NextResponse } from "next/server";

import { CronAuthError, assertCronAuthorized } from "@/lib/security/cron-auth";
import { ensureTelegramWebhook } from "@/lib/telegram/bot";
import { runWeeklyNudge } from "@/lib/telegram/nudge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertCronAuthorized(request);
    await ensureTelegramWebhook();
    const result = await runWeeklyNudge();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof CronAuthError ? error.statusCode : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status },
    );
  }
}
