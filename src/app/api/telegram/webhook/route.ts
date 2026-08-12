import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, telegramWebhookSecret } from "@/lib/telegram/bot";

type TgUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

function extractKeyword(text: string): string {
  const cleaned = text.replace(/^\/\S+\s*/, "").trim();
  const first = cleaned.split(/\s+/)[0] ?? "";
  return first.replace(/^#/, "").toLowerCase();
}

export async function POST(request: Request) {
  const secret = telegramWebhookSecret();
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_SECRET required" },
      { status: 503 },
    );
  }

  const update = (await request.json()) as TgUpdate;
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    const ref = payload.startsWith("ref_") ? payload.slice(4) : "";
    await sendTelegramMessage(
      chatId,
      ref
        ? "Привет! Тебя пригласил друг. Открой ReelsFactory в Telegram — бонус начислится после первой оплаты."
        : "Привет! Напиши ключевое слово из комментария под рилсом — пришлю оффер.",
    );
    return NextResponse.json({ ok: true });
  }

  const keyword = extractKeyword(text);
  if (!keyword) {
    return NextResponse.json({ ok: true });
  }

  const script = await prisma.script.findFirst({
    where: { commentKeyword: { equals: keyword, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: { funnel: true },
  });

  const funnel = (script?.funnel ?? {}) as { bot_reply?: string; offer?: string };
  const reply =
    funnel.bot_reply?.trim() ||
    funnel.offer?.trim() ||
    `Ключевое слово «${keyword}» принято. Напиши в директ — пришлём детали.`;

  await sendTelegramMessage(chatId, reply);
  return NextResponse.json({ ok: true });
}
