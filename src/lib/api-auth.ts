import { NextResponse } from "next/server";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveTelegramAuth } from "@/lib/telegram/auth";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function initDataFrom(request: Request) {
  return (
    request.headers.get("x-telegram-init-data") ||
    request.headers.get("X-Telegram-Init-Data") ||
    ""
  );
}

/**
 * Bind API mutations to a real Mini App user.
 * Production: HMAC initData required (TELEGRAM_BOT_TOKEN).
 * Local/mock: trust claimed userId (browser demo).
 */
export async function requireUser(
  request: Request,
  claimedUserId?: string | null,
): Promise<User> {
  const initData = initDataFrom(request);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const requireAuth =
    process.env.REQUIRE_TELEGRAM_AUTH === "true" ||
    process.env.NODE_ENV === "production";

  if (requireAuth) {
    if (!botToken) {
      throw new AuthError("Сервер без TELEGRAM_BOT_TOKEN", 503);
    }
    if (!initData) {
      throw new AuthError("Нужен валидный Telegram initData");
    }
  }

  if (initData && botToken) {
    try {
      const auth = resolveTelegramAuth({ initData });
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(auth.telegramId) },
      });
      if (!user) {
        throw new AuthError("Пользователь не найден", 404);
      }
      if (claimedUserId && claimedUserId !== user.id) {
        throw new AuthError("Нет доступа к этому аккаунту", 403);
      }
      return user;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        error instanceof Error ? error.message : "Невалидный Telegram initData",
      );
    }
  }

  if (!claimedUserId) {
    throw new AuthError("userId обязателен");
  }
  const user = await prisma.user.findUnique({ where: { id: claimedUserId } });
  if (!user) {
    throw new AuthError("Пользователь не найден", 404);
  }
  return user;
}

/** Hide scrape/whisper/LLM debug routes in production */
export function denyPublicCogs() {
  if (process.env.ALLOW_PUBLIC_AI_DEBUG === "true") return null;
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message, code: "AUTH" },
      { status: error.status },
    );
  }
  return null;
}

/** Hide scrape/whisper internals from Mini App clients */
export function publicAnalysis<T extends object>(analysis: T) {
  const clone = { ...analysis } as T & {
    rawProfileData?: unknown;
    transcriptions?: unknown;
  };
  delete clone.rawProfileData;
  delete clone.transcriptions;
  return clone;
}
