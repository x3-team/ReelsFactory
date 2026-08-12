/**
 * Minimal Telegram Bot API helper (sendMessage).
 * Used by comment-keyword webhook and Agency weekly reports.
 */
export async function sendTelegramMessage(
  chatId: number | bigint | string,
  text: string,
): Promise<{ ok: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN missing — skip sendMessage");
    return { ok: false };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: String(chatId),
      text: text.slice(0, 3900),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(`Telegram sendMessage failed (${res.status}): ${body.slice(0, 200)}`);
    return { ok: false };
  }
  return { ok: true };
}

export function telegramWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || "";
}
