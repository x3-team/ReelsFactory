import { NextResponse } from "next/server";
import { z } from "zod";

import { runAnalysisPipeline } from "@/lib/pipeline/run-analysis";
import { serialize } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { userId } = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const analysis = await runAnalysisPipeline(user);
    return NextResponse.json(serialize({ analysis }));
  } catch (error) {
    console.error("POST /api/analyze", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Analysis pipeline failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const analysis = await prisma.profileAnalysis.findUnique({
    where: { id },
    include: { scripts: { orderBy: { createdAt: "asc" } } },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serialize({ analysis }));
}
