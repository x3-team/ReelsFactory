import { NextResponse } from "next/server";
import { z } from "zod";

import { generateStrategy } from "@/lib/ai/generate-strategy";

const bodySchema = z.object({
  profile: z.object({
    handle: z.string(),
    platform: z.enum(["instagram", "tiktok", "youtube"]),
    displayName: z.string().optional(),
    bio: z.string(),
    followers: z.number(),
    following: z.number().optional(),
    postsCount: z.number().optional(),
    topVideos: z.array(
      z.object({
        id: z.string(),
        url: z.string(),
        caption: z.string().optional(),
        views: z.number(),
        likes: z.number().optional(),
        audioUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        durationSec: z.number().optional(),
      }),
    ),
  }),
  transcriptions: z.array(z.string()),
  goal: z.string(),
  tone: z.string(),
  offerSummary: z.string().nullish(),
  websiteUrl: z.string().nullish(),
  plan: z.enum(["FREE", "START", "PRO", "AGENCY"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await generateStrategy(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/generate-strategy", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate strategy",
      },
      { status: 400 },
    );
  }
}
