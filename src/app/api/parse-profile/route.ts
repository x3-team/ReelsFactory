import { NextResponse } from "next/server";
import { z } from "zod";

import { denyPublicCogs } from "@/lib/api-auth";
import { HonestyError, isMockScrapedProfile } from "@/lib/honesty";
import { detectPlatform, normalizeHandle } from "@/lib/platform";
import { parseProfile } from "@/lib/scraping/parse-profile";

const bodySchema = z.object({
  handle: z.string().min(2),
  platform: z.enum(["instagram", "tiktok", "youtube"]).optional(),
});

export async function POST(request: Request) {
  const closed = denyPublicCogs();
  if (closed) return closed;

  try {
    const body = bodySchema.parse(await request.json());
    const platform = body.platform || detectPlatform(body.handle);
    const handle = normalizeHandle(body.handle, platform);
    const profile = await parseProfile({ handle, platform });

    return NextResponse.json({
      profile,
      mocked: isMockScrapedProfile(profile),
    });
  } catch (error) {
    console.error("POST /api/parse-profile", error);
    const status = error instanceof HonestyError ? error.status : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse profile",
        code: error instanceof HonestyError ? error.code : undefined,
      },
      { status },
    );
  }
}
