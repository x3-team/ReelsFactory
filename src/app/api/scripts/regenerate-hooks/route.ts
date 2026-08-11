import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAiTunnelClient,
  llmModelForPlan,
  shouldUseMockAi,
} from "@/lib/ai/aitunnel";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { hasPaidAccess } from "@/lib/users";

const bodySchema = z.object({
  userId: z.string().min(1),
  scriptId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const script = await prisma.script.findFirst({
      where: { id: body.scriptId, userId: body.userId },
      include: {
        analysis: true,
        user: true,
      },
    });
    if (!script) {
      return NextResponse.json({ error: "Сценарий не найден" }, { status: 404 });
    }
    if (script.isTeaser && !hasPaidAccess(script.user)) {
      return NextResponse.json(
        { error: "Сценарий закрыт — открой тариф или пакет" },
        { status: 403 },
      );
    }

    let hooks: string[] = [];
    if (shouldUseMockAi()) {
      hooks = [
        "Хватит гадать — вот простой тест за 3 секунды.",
        "Одна ошибка, из‑за которой всё плывёт.",
        "Сделай так — и сразу видно результат.",
      ];
    } else {
      const openai = getAiTunnelClient();
      const model = llmModelForPlan(script.user.subscriptionPlan);
      const completion = await openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              'Верни JSON {"hook_options": string[3]}. Каждый хук ≤ 12 слов, на русском, разные углы (боль/любопытство/результат), без «привет».',
          },
          {
            role: "user",
            content: JSON.stringify({
              title: script.title,
              format: script.format,
              niche: script.analysis.niche,
              current_hooks: script.hookOptions,
              teleprompter_preview: script.teleprompterScript.slice(0, 400),
            }),
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw) as { hook_options?: string[] };
      hooks = (parsed.hook_options || []).slice(0, 3);
    }

    if (hooks.length < 3) {
      return NextResponse.json(
        { error: "Не удалось сгенерировать хуки" },
        { status: 502 },
      );
    }

    const updated = await prisma.script.update({
      where: { id: script.id },
      data: { hookOptions: hooks },
    });

    return NextResponse.json(serialize({ script: updated, hookOptions: hooks }));
  } catch (error) {
    console.error("POST /api/scripts/regenerate-hooks", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось обновить хуки",
      },
      { status: 400 },
    );
  }
}
