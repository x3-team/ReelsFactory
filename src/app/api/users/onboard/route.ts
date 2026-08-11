import { ProfileGoal, ToneOfVoice } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { detectPlatform, normalizeHandle } from "@/lib/platform";
import { serialize } from "@/lib/serialize";
import { completeOnboarding } from "@/lib/users";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  userId: z.string().min(1),
  socialHandle: z.string().min(2),
  profileGoal: z.nativeEnum(ProfileGoal),
  toneOfVoice: z.nativeEnum(ToneOfVoice),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  offerSummary: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const platform = detectPlatform(body.socialHandle);
    const handle = normalizeHandle(body.socialHandle, platform);

    const user = await completeOnboarding(body.userId, {
      socialHandle: handle,
      platform,
      profileGoal: body.profileGoal,
      toneOfVoice: body.toneOfVoice,
      websiteUrl: body.websiteUrl || null,
      offerSummary: body.offerSummary || null,
    });

    return NextResponse.json(serialize({ user }));
  } catch (error) {
    console.error("POST /api/users/onboard", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save onboarding",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serialize({ user }));
}
