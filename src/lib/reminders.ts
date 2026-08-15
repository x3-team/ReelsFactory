import { appUrl } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/bot";

/** Второй ролик — там, где обычно ломается регулярность. */
const SHOOT_NEXT_SCRIPT_DAYS = 2;
const SHOOT_NEXT_SCRIPT = "shoot_next_script";

/**
 * Планирует напоминание снять следующий сценарий.
 * Идемпотентно: повторный разбор того же анализа не плодит дубли.
 */
export async function scheduleShootReminder(input: {
  userId: string;
  analysisId: string;
  days?: number;
}) {
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + (input.days ?? SHOOT_NEXT_SCRIPT_DAYS));

  const text = [
    "Сценарий 2 из твоего разбора всё ещё ждёт съёмки.",
    "Алгоритмы любят ритм: второй ролик за неделю тянет охват первого.",
    `Открыть: ${appUrl()}/app`,
  ].join("\n");

  await prisma.reminder.upsert({
    where: {
      userId_analysisId_kind: {
        userId: input.userId,
        analysisId: input.analysisId,
        kind: SHOOT_NEXT_SCRIPT,
      },
    },
    create: {
      userId: input.userId,
      analysisId: input.analysisId,
      kind: SHOOT_NEXT_SCRIPT,
      text,
      dueAt,
    },
    update: { dueAt, sentAt: null, failedAt: null, text },
  });
}

/**
 * Рассылает наступившие напоминания. Вызывается из защищённого роута по крону,
 * поэтому за раз берём ограниченную пачку.
 */
export async function dispatchDueReminders(limit = 50) {
  const due = await prisma.reminder.findMany({
    where: { sentAt: null, failedAt: null, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: { user: { select: { telegramId: true } } },
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    const result = await sendTelegramMessage(
      reminder.user.telegramId.toString(),
      reminder.text,
    ).catch(() => ({ ok: false }));

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: result.ok ? { sentAt: new Date() } : { failedAt: new Date() },
    });

    if (result.ok) sent += 1;
    else failed += 1;
  }

  return { picked: due.length, sent, failed };
}
