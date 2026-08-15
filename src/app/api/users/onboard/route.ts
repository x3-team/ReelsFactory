import { NextResponse } from "next/server";
import { z } from "zod";

import { ProfileGoal, ToneOfVoice } from "@prisma/client";

import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { HonestyError, assertCanAnalyzeProfile } from "@/lib/honesty";
import { detectPlatform, normalizeHandle } from "@/lib/platform";
import {
  hasEnoughSubmittedReels,
  parseSubmittedReels,
} from "@/lib/submitted-reels";
import { serialize } from "@/lib/serialize";
import { completeOnboarding } from "@/lib/users";
import { polishVoiceDraft } from "@/lib/ai/polish-voice-draft";
import { NICHE_PRESETS } from "@/lib/niche-presets";
import { prisma } from "@/lib/prisma";

const nicheIds = NICHE_PRESETS.map((p) => p.id) as [string, ...string[]];

const bodySchema = z.object({
  userId: z.string().min(1),
  socialHandle: z.string().min(2),
  profileGoal: z.nativeEnum(ProfileGoal),
  toneOfVoice: z.nativeEnum(ToneOfVoice),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  offerSummary: z.string().max(500).optional(),
  nichePreset: z.enum(nicheIds).optional(),
  voiceDraft: z.string().max(4000).optional(),
  submittedReelsText: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    await requireUser(request, body.userId);
    const platform = detectPlatform(body.socialHandle);
    const handle = normalizeHandle(body.socialHandle, platform);
    const submittedReels = parseSubmittedReels(body.submittedReelsText);
    assertCanAnalyzeProfile(platform, process.env, {
      hasUserReels: hasEnoughSubmittedReels(submittedReels),
    });

    let voiceDraft = body.voiceDraft?.trim() || null;
    if (voiceDraft) {
      const polished = await polishVoiceDraft({
        rawText: voiceDraft,
        nichePreset: body.nichePreset,
      });
      voiceDraft = polished.polished;
    }

    const user = await completeOnboarding(body.userId, {
      socialHandle: handle,
      platform,
      profileGoal: body.profileGoal,
      toneOfVoice: body.toneOfVoice,
      websiteUrl: body.websiteUrl || null,
      offerSummary: body.offerSummary || null,
      nichePreset: body.nichePreset || null,
      voiceDraft,
      submittedReels,
    });

    return NextResponse.json(serialize({ user }));
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/users/onboard", error);
    const status = error instanceof HonestyError ? error.status : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save onboarding",
        code: error instanceof HonestyError ? error.code : undefined,
      },
      { status },
    );
  }
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId");
    const user = await requireUser(request, userId);
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serialize({ user: fresh }));
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
