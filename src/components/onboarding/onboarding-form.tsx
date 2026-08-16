"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  assertSupportedPlatform,
  detectPlatform,
  YOUTUBE_UNSUPPORTED_MESSAGE,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

export type OnboardingValues = {
  socialHandle: string;
  profileGoal: "GROW_AUDIENCE" | "SELL_PRODUCT";
  toneOfVoice: "DIRECT" | "HUMOROUS" | "EXPERT" | "STORYTELLING";
  websiteUrl?: string;
  offerSummary?: string;
};

const GOALS = [
  {
    id: "GROW_AUDIENCE" as const,
    title: "Хочу больше людей",
    description: "Чтобы ролик досматривали и подписывались",
  },
  {
    id: "SELL_PRODUCT" as const,
    title: "Хочу продажи",
    description: "Чтобы писали в директ или оставляли коммент",
  },
];

const TONES = [
  { id: "DIRECT" as const, label: "Прямо" },
  { id: "HUMOROUS" as const, label: "С шуткой" },
  { id: "EXPERT" as const, label: "Как эксперт" },
  { id: "STORYTELLING" as const, label: "Как историю" },
];

export function OnboardingForm({
  userName,
  initialHandle,
  loading,
  submitError,
  onSubmit,
}: {
  userName: string;
  /** Ник, введённый на витрине: /app?handle=… */
  initialHandle?: string;
  loading?: boolean;
  submitError?: string | null;
  onSubmit: (values: OnboardingValues) => Promise<void> | void;
}) {
  const [step, setStep] = useState(0);
  const [socialHandle, setSocialHandle] = useState(initialHandle ?? "");
  const [profileGoal, setProfileGoal] =
    useState<OnboardingValues["profileGoal"]>("GROW_AUDIENCE");
  const [toneOfVoice, setToneOfVoice] =
    useState<OnboardingValues["toneOfVoice"]>("DIRECT");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [offerSummary, setOfferSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialHandle) setSocialHandle((value) => value || initialHandle);
  }, [initialHandle]);

  async function next() {
    setError(null);
    if (step === 0 && socialHandle.trim().length < 2) {
      setError("Вставь @username Instagram или TikTok");
      return;
    }
    if (step === 0) {
      try {
        assertSupportedPlatform(detectPlatform(socialHandle));
      } catch {
        setError(YOUTUBE_UNSUPPORTED_MESSAGE);
        return;
      }
    }
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    await onSubmit({
      socialHandle: socialHandle.trim(),
      profileGoal,
      toneOfVoice,
      websiteUrl: websiteUrl.trim() || undefined,
      offerSummary: offerSummary.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-5 pb-8">
      <header className="pt-3">
        <p className="text-sm text-muted-foreground">Привет, {userName}</p>
        <h1 className="font-display mt-2 text-[2rem] font-semibold">
          Вставь профиль — получишь текст в камеру
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Разберём рилсы и напишем, что говорить. Не лозунг, не «мы №1».
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Шаг {step + 1} из 3
        </p>
        <div className="mt-2 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-primary" : "bg-secondary",
              )}
            />
          ))}
        </div>
      </header>

      {step === 0 && (
        <section className="space-y-3">
          <Label htmlFor="handle">Instagram или TikTok</Label>
          <Input
            id="handle"
            placeholder="@username"
            value={socialHandle}
            onChange={(e) => setSocialHandle(e.target.value)}
            autoFocus
            className="h-12 rounded-2xl text-base"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            YouTube не берём — не угадываем площадку. Нужен открытый Instagram
            или TikTok.
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <Label>Зачем снимаешь</Label>
          <div className="grid gap-2">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => setProfileGoal(goal.id)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition",
                  profileGoal === goal.id
                    ? "border-primary bg-accent"
                    : "border-border bg-card",
                )}
              >
                <div className="text-base font-medium">{goal.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {goal.description}
                </div>
              </button>
            ))}
          </div>

          <Label className="pt-2">Как говоришь</Label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => setToneOfVoice(tone.id)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-sm font-medium",
                  toneOfVoice === tone.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="offer">Что даёшь людям (необязательно)</Label>
            <Textarea
              id="offer"
              placeholder="Чеклист, консультация, курс…"
              value={offerSummary}
              onChange={(e) => setOfferSummary(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Сайт (необязательно)</Label>
            <Input
              id="website"
              placeholder="https://"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
        </section>
      )}

      {(error || submitError) && (
        <p className="text-sm text-destructive">{error || submitError}</p>
      )}

      <div className="mt-auto flex gap-2">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-2xl"
            onClick={() => setStep((s) => s - 1)}
            disabled={loading}
          >
            Назад
          </Button>
        )}
        <Button
          type="button"
          className="h-12 flex-1 rounded-2xl text-base"
          onClick={() => void next()}
          disabled={loading}
        >
          {step === 2
            ? loading
              ? "Собираем…"
              : "Собрать сценарии"
            : "Дальше"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
