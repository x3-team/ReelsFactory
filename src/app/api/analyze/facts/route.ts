import { NextResponse } from "next/server";
import { z } from "zod";

import { continueAnalysisWithFacts } from "@/lib/pipeline/run-analysis";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const bodySchema = z.object({
  userId: z.string().min(1),
  analysisId: z.string().min(1),
  facts: z.array(z.string().min(8).max(280)).min(3).max(5),
  offerSummary: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const analysis = await continueAnalysisWithFacts({
      user,
      analysisId: body.analysisId,
      facts: body.facts,
      offerSummary: body.offerSummary,
    });

    return NextResponse.json(serialize({ analysis }));
  } catch (error) {
    console.error("POST /api/analyze/facts", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось собрать сценарии из фактов",
      },
      { status: 400 },
    );
  }
}
