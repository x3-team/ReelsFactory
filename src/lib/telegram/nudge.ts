import { prisma } from "@/lib/prisma";
import {
  countUnshotScripts,
  parseTelegramStart,
  sendTelegramMessage,
  startWelcomeText,
  usersDueForWeeklyNudge,
  weeklyNudgeText,
  type TelegramUpdate,
} from "@/lib/telegram/bot";
import { upsertTelegramUser } from "@/lib/users";

export type { TelegramUpdate };

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  const text = message?.text;
  const from = message?.from;
  const chatId = message?.chat?.id ?? from?.id;
  const start = parseTelegramStart(text);
  if (!start || !from?.id || chatId == null) {
    return { handled: false as const };
  }

  const user = await upsertTelegramUser({
    telegramId: from.id,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    languageCode: from.language_code,
    startParam: start.startParam,
  });
  const unshotCount = await countUnshotScripts(user.id);
  await sendTelegramMessage({
    chatId,
    text: startWelcomeText({ firstName: user.firstName, unshotCount }),
  });
  return { handled: true as const, userId: user.id, unshotCount };
}

export async function runWeeklyNudge(now = new Date()) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { sent: 0, skipped: "no_token" as const, candidates: 0 };
  }

  const due = await usersDueForWeeklyNudge(now);
  let sent = 0;
  let failed = 0;
  for (const user of due) {
    const unshot = user._count.scripts;
    if (unshot < 1) continue;
    const result = await sendTelegramMessage({
      chatId: user.telegramId,
      text: weeklyNudgeText(unshot),
    });
    const ok =
      result && typeof result === "object" && "ok" in result && result.ok === true;
    if (!ok) {
      failed += 1;
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { lastNudgeAt: now },
    });
    sent += 1;
  }
  return { sent, failed, skipped: null, candidates: due.length };
}
