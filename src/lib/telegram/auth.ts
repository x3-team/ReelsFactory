import { createHmac, timingSafeEqual } from "crypto";

export type ValidatedTelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
};

export type ValidatedInitData = {
  user?: ValidatedTelegramUser;
  start_param?: string;
  auth_date: number;
  hash: string;
  raw: string;
};

/**
 * Validates Telegram Mini App initData (HMAC-SHA256) per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86400,
): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("initData без hash");
  }

  params.delete("hash");
  const entries = Array.from(params.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const a = Buffer.from(calculated, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Невалидная подпись Telegram initData");
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate) {
    throw new Error("initData без auth_date");
  }
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > maxAgeSec) {
    throw new Error("Telegram initData устарел");
  }

  const userRaw = params.get("user");
  const user = userRaw
    ? (JSON.parse(userRaw) as ValidatedTelegramUser)
    : undefined;

  return {
    user,
    start_param: params.get("start_param") || undefined,
    auth_date: authDate,
    hash,
    raw: initData,
  };
}

/**
 * Resolves Telegram identity for API routes.
 * - With TELEGRAM_BOT_TOKEN + initData → verified user
 * - Without token in non-production / mock → trust body (local browser demo)
 */
export function resolveTelegramAuth(input: {
  initData?: string | null;
  telegramId?: string | number | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  photoUrl?: string | null;
  startParam?: string | null;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const requireAuth =
    process.env.REQUIRE_TELEGRAM_AUTH === "true" ||
    (process.env.NODE_ENV === "production" && Boolean(botToken));

  if (input.initData && botToken) {
    const validated = validateTelegramInitData(input.initData, botToken);
    if (!validated.user?.id) {
      throw new Error("В initData нет пользователя");
    }
    return {
      verified: true as const,
      telegramId: String(validated.user.id),
      username: validated.user.username ?? input.username ?? null,
      firstName: validated.user.first_name ?? input.firstName ?? null,
      lastName: validated.user.last_name ?? input.lastName ?? null,
      languageCode: validated.user.language_code ?? input.languageCode ?? null,
      photoUrl: validated.user.photo_url ?? input.photoUrl ?? null,
      startParam: validated.start_param ?? input.startParam ?? null,
    };
  }

  if (requireAuth) {
    throw new Error(
      "Требуется валидный Telegram initData (задайте TELEGRAM_BOT_TOKEN)",
    );
  }

  if (!input.telegramId) {
    throw new Error("telegramId обязателен в режиме разработки");
  }

  return {
    verified: false as const,
    telegramId: String(input.telegramId),
    username: input.username ?? null,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    languageCode: input.languageCode ?? null,
    photoUrl: input.photoUrl ?? null,
    startParam: input.startParam ?? null,
  };
}
