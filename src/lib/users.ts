import {
  ProfileGoal,
  SubscriptionPlan,
  ToneOfVoice,
  type User,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function parseReferrerTelegramId(startParam?: string | null) {
  if (!startParam) return null;
  const match = startParam.match(/^ref_(\d+)$/);
  return match ? BigInt(match[1]) : null;
}

export async function upsertTelegramUser(input: {
  telegramId: string | number | bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  photoUrl?: string | null;
  startParam?: string | null;
}): Promise<User> {
  const telegramId = BigInt(input.telegramId);

  const existing = await prisma.user.findUnique({ where: { telegramId } });
  const referrerTelegramId =
    parseReferrerTelegramId(input.startParam) ||
    (
      await prisma.botSession.findUnique({
        where: { telegramId },
        select: { referrerTelegramId: true },
      })
    )?.referrerTelegramId ||
    null;

  async function resolveReferrerId() {
    if (!referrerTelegramId || referrerTelegramId === telegramId) return undefined;
    const referrer = await prisma.user.findUnique({
      where: { telegramId: referrerTelegramId },
    });
    return referrer?.id;
  }

  if (existing) {
    const referrerId =
      existing.referrerId || (await resolveReferrerId()) || undefined;
    return prisma.user.update({
      where: { telegramId },
      data: {
        username: input.username ?? existing.username,
        firstName: input.firstName ?? existing.firstName,
        lastName: input.lastName ?? existing.lastName,
        languageCode: input.languageCode ?? existing.languageCode,
        photoUrl: input.photoUrl ?? existing.photoUrl,
        ...(referrerId && !existing.referrerId ? { referrerId } : {}),
      },
    });
  }

  const referrerId = await resolveReferrerId();

  return prisma.user.create({
    data: {
      telegramId,
      username: input.username ?? undefined,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      languageCode: input.languageCode ?? undefined,
      photoUrl: input.photoUrl ?? undefined,
      referrerId,
      subscriptionPlan: SubscriptionPlan.FREE,
    },
  });
}

export async function completeOnboarding(
  userId: string,
  data: {
    socialHandle: string;
    platform: string;
    profileGoal: ProfileGoal;
    toneOfVoice: ToneOfVoice;
    websiteUrl?: string | null;
    offerSummary?: string | null;
    nichePreset?: string | null;
    voiceDraft?: string | null;
    submittedReels?: unknown;
  },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      socialHandle: data.socialHandle,
      platform: data.platform,
      profileGoal: data.profileGoal,
      toneOfVoice: data.toneOfVoice,
      websiteUrl: data.websiteUrl || null,
      offerSummary: data.offerSummary || null,
      nichePreset: data.nichePreset || null,
      voiceDraft: data.voiceDraft || null,
      submittedReels: data.submittedReels ?? undefined,
      onboardedAt: new Date(),
    },
  });
}

export function hasPaidAccess(user: User) {
  if (user.subscriptionPlan === SubscriptionPlan.FREE) return false;
  // Missing expiry used to mean "paid forever" — treat as expired in production.
  if (!user.subscriptionExpiresAt) {
    return process.env.NODE_ENV !== "production";
  }
  return user.subscriptionExpiresAt.getTime() > Date.now();
}
