export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export type AppUser = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  socialHandle?: string | null;
  platform?: string | null;
  profileGoal?: "GROW_AUDIENCE" | "SELL_PRODUCT" | null;
  toneOfVoice?: "DIRECT" | "HUMOROUS" | "EXPERT" | "STORYTELLING" | null;
  websiteUrl?: string | null;
  offerSummary?: string | null;
  subscriptionPlan: "FREE" | "START" | "PRO" | "AGENCY";
  subscriptionExpiresAt?: string | null;
  referralBalance: number;
  onboardedAt?: string | null;
};

export type VisualCues = {
  start0_3s?: string;
  midAction?: string;
  finalCta?: string;
};

export type AppScript = {
  id: string;
  title: string;
  format: string;
  hookOptions: string[];
  teleprompterScript: string;
  caption: string;
  cta: string;
  isTeaser: boolean;
  visualCues?: VisualCues | null;
};

export type AppAnalysis = {
  id: string;
  status: string;
  niche?: string | null;
  targetAudience?: string | null;
  contentPillars?: Array<{ title: string; description: string }> | null;
  profileAuditTips?: string[] | null;
  socialHandle: string;
  platform: string;
  errorMessage?: string | null;
  scripts: AppScript[];
};
