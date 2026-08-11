import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const querySchema = z.object({
  userId: z.string().min(1),
});

/** История разборов пользователя */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { userId } = querySchema.parse({
      userId: searchParams.get("userId"),
    });

    const analyses = await prisma.profileAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        scripts: { orderBy: { createdAt: "asc" }, select: { id: true, title: true, isTeaser: true } },
      },
    });

    return NextResponse.json(serialize({ analyses }));
  } catch (error) {
    console.error("GET /api/analyses", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось загрузить историю",
      },
      { status: 400 },
    );
  }
}
