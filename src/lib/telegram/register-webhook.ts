import { appUrl } from "@/lib/config";
import { telegramWebhookSecret } from "@/lib/telegram/bot";

export async function registerTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = telegramWebhookSecret();
  const base = appUrl();
  if (!token || !secret) return { ok: false as const, reason: "missing token or secret" };
  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return { ok: false as const, reason: "localhost url" };
  }

  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    }),
  });
  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!json.ok) {
    console.warn("Telegram setWebhook failed:", json.description);
    return { ok: false as const, reason: json.description || "setWebhook failed" };
  }
  return { ok: true as const, url };
}
