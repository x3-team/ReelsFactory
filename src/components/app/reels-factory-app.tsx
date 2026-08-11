"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { AnalysisProgress } from "@/components/analyze/analysis-progress";
import {
  OnboardingForm,
  type OnboardingValues,
} from "@/components/onboarding/onboarding-form";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { TelegramBackButton } from "@/components/telegram/back-button";
import { useTelegram } from "@/components/telegram/telegram-provider";
import {
  api,
  type AppAnalysis,
  type AppUser,
} from "@/lib/client-api";
import { referralLink, type PlanId } from "@/lib/config";

type Screen = "boot" | "onboarding" | "analyzing" | "results" | "error";

const DEV_TELEGRAM_KEY = "reelsfactory.devTelegramId";

function getDevTelegramId() {
  if (typeof window === "undefined") return "100001";
  const existing = window.localStorage.getItem(DEV_TELEGRAM_KEY);
  if (existing) return existing;
  const id = String(100000 + Math.floor(Math.random() * 899999));
  window.localStorage.setItem(DEV_TELEGRAM_KEY, id);
  return id;
}

export function ReelsFactoryApp() {
  const { ready, user: tgUser, startParam, isTelegram } = useTelegram();
  const [screen, setScreen] = useState<Screen>("boot");
  const [user, setUser] = useState<AppUser | null>(null);
  const [analysis, setAnalysis] = useState<AppAnalysis | null>(null);
  const [referralUrl, setReferralUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (user?.firstName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    if (tgUser?.first_name) {
      return [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
    }
    return user?.username || tgUser?.username || "Автор";
  }, [user, tgUser]);

  const bootstrap = useCallback(async () => {
    setScreen("boot");
    setError(null);

    const telegramId = tgUser?.id ? String(tgUser.id) : getDevTelegramId();
    const payload = {
      telegramId,
      username: tgUser?.username ?? (isTelegram ? null : "local_dev"),
      firstName: tgUser?.first_name ?? (isTelegram ? null : "Локальный"),
      lastName: tgUser?.last_name ?? (isTelegram ? null : "Автор"),
      languageCode: tgUser?.language_code ?? "ru",
      photoUrl: tgUser?.photo_url ?? null,
      startParam:
        startParam ||
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("start")
          : null),
    };

    const data = await api<{
      user: AppUser;
      latestAnalysis: AppAnalysis | null;
      referralLink: string;
    }>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setUser(data.user);
    setReferralUrl(data.referralLink || referralLink(data.user.telegramId));

    const paidFlag =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("paid") === "1";

    if (paidFlag) {
      // Refresh user after mock payment redirect
      const refreshed = await api<{
        user: AppUser;
        latestAnalysis: AppAnalysis | null;
        referralLink: string;
      }>("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setUser(refreshed.user);
      if (refreshed.latestAnalysis?.status === "COMPLETED") {
        setAnalysis(refreshed.latestAnalysis);
        setScreen("results");
        window.history.replaceState({}, "", "/");
        return;
      }
    }

    if (data.latestAnalysis?.status === "COMPLETED") {
      setAnalysis(data.latestAnalysis);
      setScreen("results");
      return;
    }

    if (data.user.onboardedAt) {
      setScreen("analyzing");
      await runAnalysis(data.user.id);
      return;
    }

    setScreen("onboarding");
  }, [tgUser, startParam, isTelegram]);

  useEffect(() => {
    if (!ready) return;
    void bootstrap().catch((err: Error) => {
      setError(err.message);
      setScreen("error");
    });
  }, [ready, bootstrap]);

  async function runAnalysis(userId: string) {
    setScreen("analyzing");
    setError(null);
    const startedAt = Date.now();
    try {
      const data = await api<{ analysis: AppAnalysis }>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      // Keep the progress UI visible long enough to show the animated steps
      const elapsed = Date.now() - startedAt;
      const minMs = 4500;
      if (elapsed < minMs) {
        await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
      }
      setAnalysis(data.analysis);
      setScreen("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setScreen("error");
    }
  }

  async function handleOnboarding(values: OnboardingValues) {
    if (!user) return;
    setError(null);
    const data = await api<{ user: AppUser }>("/api/users/onboard", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, ...values }),
    });
    setUser(data.user);
    await runAnalysis(data.user.id);
  }

  async function handleSelectPlan(plan: Exclude<PlanId, "FREE">) {
    if (!user) return;
    setLoadingPlan(plan);
    try {
      const data = await api<{
        confirmationUrl?: string;
        mocked?: boolean;
        payment: { providerPaymentId?: string };
      }>("/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, plan }),
      });

      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
        return;
      }

      throw new Error("No confirmation URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoadingPlan(null);
    }
  }

  if (screen === "boot" || !ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4 text-center">
        <TelegramBackButton show={false} />
        <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => void bootstrap()}
        >
          Повторить
        </button>
      </div>
    );
  }

  if (screen === "onboarding") {
    return (
      <>
        <TelegramBackButton show={false} />
        <OnboardingForm
          userName={displayName}
          onSubmit={handleOnboarding}
        />
      </>
    );
  }

  if (screen === "analyzing") {
    return (
      <>
        <TelegramBackButton show={false} />
        <AnalysisProgress failedMessage={null} />
      </>
    );
  }

  if (screen === "results" && user && analysis) {
    return (
      <>
        <TelegramBackButton show={false} />
        <ResultsDashboard
          user={user}
          analysis={analysis}
          referralUrl={referralUrl}
          onSelectPlan={handleSelectPlan}
          loadingPlan={loadingPlan}
          onReanalyze={() => {
            if (user) void runAnalysis(user.id);
          }}
        />
      </>
    );
  }

  return null;
}
