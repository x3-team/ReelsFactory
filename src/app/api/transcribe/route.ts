import { NextResponse } from "next/server";
import { z } from "zod";

import { transcribeAudio } from "@/lib/ai/transcribe";

const bodySchema = z.object({
  audioUrl: z.string().url(),
  hint: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await transcribeAudio(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/transcribe", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to transcribe audio",
      },
      { status: 400 },
    );
  }
}
