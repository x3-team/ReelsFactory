import { timingSafeEqual } from "crypto";

export function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new CronAuthError("CRON_SECRET не задан");
    }
    return;
  }
  if (!safeEqual(readBearerToken(request), secret)) {
    throw new CronAuthError("Неверный cron-секрет");
  }
}

export function assertTelegramWebhookSecret(request: Request) {
  const expected =
    process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET || "";
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      throw new CronAuthError("Нет секрета вебхука Telegram");
    }
    return;
  }
  const got = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!safeEqual(got, expected)) {
    throw new CronAuthError("Неверный секрет вебхука Telegram");
  }
}

export class CronAuthError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = "CronAuthError";
  }
}
