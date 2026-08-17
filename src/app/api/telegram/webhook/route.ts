import { NextResponse } from "next/server";

import { CronAuthError, assertTelegramWebhookSecret } from "@/lib/security/cron-auth";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/nudge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTelegramWebhookSecret(request);
    const update = (await request.json()) as TelegramUpdate;
    const result = await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof CronAuthError ? error.statusCode : 400;
    console.error("POST /api/telegram/webhook", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status },
    );
  }
}
