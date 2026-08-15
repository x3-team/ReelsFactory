import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireUser } from "@/lib/api-auth";
import { PLANS } from "@/lib/config";
import { HonestyError, assertCanAnalyzeProfile } from "@/lib/honesty";
import { detectPlatform, normalizeHandle } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { hasPaidAccess } from "@/lib/users";

const createSchema = z.object({
  userId: z.string().min(1),
  socialHandle: z.string().min(2),
  label: z.string().max(80).optional(),
  offerSummary: z.string().max(500).optional(),
  nichePreset: z.string().max(40).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  profileGoal: z.enum(["GROW_AUDIENCE", "SELL_PRODUCT"]).optional(),
  toneOfVoice: z
    .enum(["DIRECT", "HUMOROUS", "EXPERT", "STORYTELLING"])
    .optional(),
});

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId");
    const user = await requireUser(request, userId);
    const accounts = await prisma.clientAccount.findMany({
      where: { agencyUserId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(serialize({ accounts }));
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const user = await requireUser(request, body.userId);
    if (
      !hasPaidAccess(user) ||
      user.subscriptionPlan !== SubscriptionPlan.AGENCY
    ) {
      return NextResponse.json(
        { error: "Клиентские аккаунты доступны на тарифе Агентство" },
        { status: 403 },
      );
    }

    const max = PLANS.AGENCY.maxClientAccounts;
    const count = await prisma.clientAccount.count({
      where: { agencyUserId: user.id },
    });
    if (count >= max) {
      return NextResponse.json(
        { error: `Лимит тарифа Агентство: ${max} аккаунтов` },
        { status: 400 },
      );
    }

    const platform = detectPlatform(body.socialHandle);
    const handle = normalizeHandle(body.socialHandle, platform);
    assertCanAnalyzeProfile(platform, process.env, { handle });
    const account = await prisma.clientAccount.create({
      data: {
        agencyUserId: user.id,
        socialHandle: handle,
        platform,
        label: body.label || handle,
        offerSummary: body.offerSummary || null,
        nichePreset: body.nichePreset || null,
        websiteUrl: body.websiteUrl || null,
        profileGoal: body.profileGoal || null,
        toneOfVoice: body.toneOfVoice || null,
      },
    });

    return NextResponse.json(serialize({ account }));
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("POST /api/clients", error);
    const status = error instanceof HonestyError ? error.status : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось добавить аккаунт",
        code: error instanceof HonestyError ? error.code : undefined,
      },
      { status },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id обязателен" }, { status: 400 });
    }
    const user = await requireUser(request, userId);
    await prisma.clientAccount.deleteMany({
      where: { id, agencyUserId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    return NextResponse.json(
      { error: "userId и id обязательны" },
      { status: 400 },
    );
  }
}
