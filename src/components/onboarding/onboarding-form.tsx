"use client";

import { useState } from "react";
import { ArrowRight, Clapperboard } from "lucide-react";

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
    title: "Рост аудитории",
    description: "Больше подписчиков, сохранений и охватов",
  },
  {
    id: "SELL_PRODUCT" as const,
    title: "Продажа продукта / услуги",
    description: "Сценарии, которые ведут к комментариям и сообщениям",
  },
];

const TONES = [
  { id: "DIRECT" as const, label: "Прямой" },
  { id: "HUMOROUS" as const, label: "Юмор" },
  { id: "EXPERT" as const, label: "Эксперт" },
  { id: "STORYTELLING" as const, label: "Сторителлинг" },
];

export function OnboardingForm({
  userName,
  loading,
  submitError,
  onSubmit,
}: {
  userName: string;
  loading?: boolean;
  submitError?: string | null;
  onSubmit: (values: OnboardingValues) => Promise<void> | void;
}) {
  const [step, setStep] = useState(0);
  const [socialHandle, setSocialHandle] = useState("");
  const [profileGoal, setProfileGoal] =
    useState<OnboardingValues["profileGoal"]>("GROW_AUDIENCE");
  const [toneOfVoice, setToneOfVoice] =
    useState<OnboardingValues["toneOfVoice"]>("DIRECT");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [offerSummary, setOfferSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function next() {
    setError(null);
    if (step === 0 && socialHandle.trim().length < 2) {
      setError("Укажите @username Instagram или TikTok");
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-4 pb-8">
      <header className="pt-2">
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Clapperboard className="size-5" />
        </div>
        <p className="text-sm text-muted-foreground">Привет, {userName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Настроим контент-машину
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Шаг {step + 1} из 3
        </p>
        <div className="mt-3 flex gap-2">
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
          <Label htmlFor="handle">Instagram / TikTok</Label>
          <Input
            id="handle"
            placeholder="@username Instagram или TikTok"
            value={socialHandle}
            onChange={(e) => setSocialHandle(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            YouTube пока не разбираем. Нужен открытый Instagram или TikTok.
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <Label>Цель профиля</Label>
          <div className="grid gap-2">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => setProfileGoal(goal.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  profileGoal === goal.id
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <div className="font-medium">{goal.title}</div>
                <div className="text-sm text-muted-foreground">
                  {goal.description}
                </div>
              </button>
            ))}
          </div>

          <Label className="pt-2">Тон голоса</Label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => setToneOfVoice(tone.id)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-medium",
                  toneOfVoice === tone.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
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
            <Label htmlFor="offer">Оффер (необязательно)</Label>
            <Textarea
              id="offer"
              placeholder="Бесплатный чеклист, консультация, курс…"
              value={offerSummary}
              onChange={(e) => setOfferSummary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Сайт (необязательно)</Label>
            <Input
              id="website"
              placeholder="https://"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
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
            className="flex-1"
            onClick={() => setStep((s) => s - 1)}
            disabled={loading}
          >
            Назад
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          onClick={() => void next()}
          disabled={loading}
        >
          {step === 2
            ? loading
              ? "Запускаем…"
              : "Анализировать профиль"
            : "Продолжить"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
