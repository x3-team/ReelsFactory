import { AnalysisStatus } from "@prisma/client";

import { appUrl, botUsername } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const NUDGE_COOLDOWN_MS = 6 * 24 * 60 * 60 * 1000;

export type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
    from?: {
      id?: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      language_code?: string;
    };
  };
};

export function parseTelegramStart(text: string | undefined) {
  if (!text) return null;
  const match = text.trim().match(/^\/start(?:@\w+)?(?:\s+(\S+))?$/i);
  if (!match) return null;
  return { startParam: match[1] || null };
}

export function startWelcomeText(input: {
  firstName?: string | null;
  unshotCount?: number;
}) {
  const name = input.firstName?.trim() || "Привет";
  const lines = [
    `${name}, это ReelsFactory.`,
    "Вставил Instagram или TikTok — получил суфлёр 15 / 30 / 45 секунд из своих роликов.",
  ];
  if ((input.unshotCount || 0) > 0) {
    lines.push(
      `Сейчас без съёмки: ${input.unshotCount}. Открой приложение и жми «Снимать».`,
    );
  }
  return lines.join("\n");
}

export function weeklyNudgeText(unshotCount: number) {
  const n = Math.max(1, unshotCount);
  return `Лежат ${n} ${pluralScripts(n)} без съёмки. Открой суфлёр — 15 секунд уже можно снять.`;
}

function pluralScripts(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "сценарий";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "сценария";
  return "сценариев";
}

export function miniAppKeyboard() {
  const url = `${appUrl().replace(/\/$/, "")}/app`;
  return {
    inline_keyboard: [
      [{ text: "Открыть суфлёр", web_app: { url } }],
    ],
  };
}

export async function countUnshotScripts(userId: string) {
  return prisma.script.count({
    where: {
      userId,
      isTeaser: false,
      shotAt: null,
      analysis: { status: AnalysisStatus.COMPLETED },
    },
  });
}

export async function usersDueForWeeklyNudge(now = new Date()) {
  const cutoff = new Date(now.getTime() - NUDGE_COOLDOWN_MS);
  return prisma.user.findMany({
    where: {
      AND: [
        { OR: [{ lastNudgeAt: null }, { lastNudgeAt: { lt: cutoff } }] },
        {
          scripts: {
            some: {
              isTeaser: false,
              shotAt: null,
              analysis: { status: AnalysisStatus.COMPLETED },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastNudgeAt: true,
      _count: {
        select: {
          scripts: {
            where: {
              isTeaser: false,
              shotAt: null,
              analysis: { status: AnalysisStatus.COMPLETED },
            },
          },
        },
      },
    },
    take: 200,
  });
}

export function telegramApiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function telegramCall<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T | { ok: false; skipped: string }> {
  const url = telegramApiUrl(method);
  if (!url) return { ok: false, skipped: "no_token" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T;
  return data;
}

export async function sendTelegramMessage(input: {
  chatId: string | number | bigint;
  text: string;
}) {
  return telegramCall("sendMessage", {
    chat_id: String(input.chatId),
    text: input.text,
    reply_markup: miniAppKeyboard(),
  });
}

export async function ensureTelegramWebhook() {
  const url = `${appUrl().replace(/\/$/, "")}/api/telegram/webhook`;
  const secret =
    process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET || "";
  return telegramCall("setWebhook", {
    url,
    secret_token: secret || undefined,
    allowed_updates: ["message"],
  });
}

export function botDeepLink() {
  return `https://t.me/${botUsername()}`;
}
