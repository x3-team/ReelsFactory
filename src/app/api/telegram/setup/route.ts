import { NextResponse } from "next/server";

import { registerTelegramWebhook } from "@/lib/telegram/register-webhook";
import { telegramWebhookSecret } from "@/lib/telegram/bot";

export async function POST(request: Request) {
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET || telegramWebhookSecret();
  const header =
    request.headers.get("x-setup-secret") ||
    request.headers.get("x-telegram-bot-api-secret-token");
  if (!setupSecret || header !== setupSecret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await registerTelegramWebhook();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
