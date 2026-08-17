import { NextResponse } from "next/server";

import { CronAuthError, assertCronAuthorized } from "@/lib/security/cron-auth";
import { ensureTelegramWebhook } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCronAuthorized(request);
    const result = await ensureTelegramWebhook();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const status = error instanceof CronAuthError ? error.statusCode : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status },
    );
  }
}
