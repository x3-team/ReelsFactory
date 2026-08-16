import { NextResponse } from "next/server";
import { z } from "zod";

import { detectPlatform, normalizeHandle, assertSupportedPlatform } from "@/lib/platform";
import {
  hasScrapingCredentials,
  parseProfile,
} from "@/lib/scraping/parse-profile";
import { isMockMode } from "@/lib/config";

const bodySchema = z.object({
  handle: z.string().min(2),
  platform: z.enum(["instagram", "tiktok", "youtube"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const platform = body.platform || detectPlatform(body.handle);
    assertSupportedPlatform(platform);
    const handle = normalizeHandle(body.handle, platform);
    const profile = await parseProfile({ handle, platform });

    return NextResponse.json({
      profile,
      mocked: isMockMode() || !hasScrapingCredentials(),
    });
  } catch (error) {
    console.error("POST /api/parse-profile", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse profile",
      },
      { status: 400 },
    );
  }
}
