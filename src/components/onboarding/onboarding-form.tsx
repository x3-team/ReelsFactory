"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppVersion } from "@/components/app/app-version";
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
    description: "Больше просмотров, сохранений и подписчиков",
  },
  {
    id: "SELL_PRODUCT" as const,
    title: "Продажи",
    description: "Сценарии, которые ведут к заявкам и покупкам",
  },
];

const TONES = [
  { id: "DIRECT" as const, label: "Прямой" },
  { id: "HUMOROUS" as const, label: "Юмор" },
  { id: "EXPERT" as const, label: "Эксперт" },
  { id: "STORYTELLING" as const, label: "Истории" },
];

export function OnboardingForm({
  userName,
  loading,
  onSubmit,
}: {
  userName: string;
  loading?: boolean;
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
      setError("Введи @ник Instagram/TikTok или ссылку на YouTube");
      return;
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
    <div className="rf-shell animate-rf-rise gap-6 p-4 pt-6">
      <header className="space-y-4">
        <p className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Reels<span className="text-primary">Factory</span>
        </p>
        <div>
          <p className="text-sm text-muted-foreground">Привет, {userName}</p>
          <h1 className="font-display mt-1 text-2xl font-semibold leading-tight tracking-tight">
            {step === 0 && "Какой аккаунт разбираем?"}
            {step === 1 && "Зачем снимаешь рилсы?"}
            {step === 2 && "Что продаёшь? (по желанию)"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Шаг {step + 1} из 3 · обычно меньше минуты
          </p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-secondary",
              )}
            />
          ))}
        </div>
      </header>

      {step === 0 && (
        <section className="space-y-3">
          <Label htmlFor="handle">@ник или ссылка</Label>
          <Input
            id="handle"
            className="h-12 rounded-xl border-border/80 bg-card text-base"
            placeholder="@username"
            value={socialHandle}
            onChange={(e) => setSocialHandle(e.target.value)}
            autoFocus
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Разберём био и сильные рилсы, вытащим цепляющие фразы и соберём
            сценарии под съёмку.
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <div className="space-y-2">
            <Label>Цель</Label>
            <div className="grid gap-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setProfileGoal(goal.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    profileGoal === goal.id
                      ? "border-primary bg-primary/5"
                      : "border-border/80 bg-card/70",
                  )}
                >
                  <div className="font-semibold">{goal.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {goal.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Тон</Label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => setToneOfVoice(tone.id)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-semibold transition",
                    toneOfVoice === tone.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-card/70",
                  )}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="offer">Что предлагаешь</Label>
            <Textarea
              id="offer"
              className="min-h-[96px] rounded-xl bg-card"
              placeholder="Курс, чеклист, консультация, доставка…"
              value={offerSummary}
              onChange={(e) => setOfferSummary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Сайт или ссылка</Label>
            <Input
              id="website"
              className="h-12 rounded-xl bg-card"
              placeholder="https://"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Можно пропустить — сценарии всё равно соберём.
          </p>
        </section>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="mt-auto flex gap-2 pt-2">
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
          size="lg"
          onClick={() => void next()}
          disabled={loading}
        >
          {step === 2
            ? loading
              ? "Запускаем…"
              : "Разобрать профиль"
            : "Дальше"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <p className="pt-2 text-center text-[11px]">
        <AppVersion className="text-muted-foreground/70" />
      </p>
    </div>
  );
}
