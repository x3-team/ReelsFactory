import { NextResponse } from "next/server";
import { z } from "zod";

import { updateScriptLifecycle } from "@/lib/scripts/lifecycle";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  scriptId: z.string().min(1),
  action: z.enum(["shot", "published", "ready"]),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    const script = await updateScriptLifecycle(body);
    return NextResponse.json(serialize({ script }));
  } catch (error) {
    console.error("POST /api/scripts/status", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось обновить статус сценария",
      },
      { status: 400 },
    );
  }
}
