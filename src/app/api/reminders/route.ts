import { NextResponse } from "next/server";

import { dispatchDueReminders } from "@/lib/reminders";
import { telegramWebhookSecret } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";

/**
 * Рассылка наступивших напоминаний. Дёргается кроном:
 *   curl -X POST "$APP_URL/api/reminders" -H "x-setup-secret: $TELEGRAM_WEBHOOK_SECRET"
 * Роут отдаёт только счётчики — никаких telegram id наружу.
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_SETUP_SECRET || telegramWebhookSecret();
  const header = request.headers.get("x-setup-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const result = await dispatchDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/reminders", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось разослать" },
      { status: 500 },
    );
  }
}
