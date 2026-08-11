"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { AppVersion } from "@/components/app/app-version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [socialHandle, setSocialHandle] = useState("");
  const [profileGoal, setProfileGoal] =
    useState<OnboardingValues["profileGoal"]>("GROW_AUDIENCE");
  const [toneOfVoice, setToneOfVoice] =
    useState<OnboardingValues["toneOfVoice"]>("DIRECT");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [offerSummary, setOfferSummary] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (socialHandle.trim().length < 2) {
      setError("Введи @ник Instagram или TikTok");
      return;
    }
    if (/youtube|youtu\.be/i.test(socialHandle)) {
      setError("YouTube пока не поддерживаем — укажи Instagram или TikTok");
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
      <header className="space-y-3">
        <p className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Reels<span className="text-primary">Factory</span>
        </p>
        <div>
          <p className="text-sm text-muted-foreground">Привет, {userName}</p>
          <h1 className="font-display mt-1 text-2xl font-semibold leading-tight tracking-tight">
            Какой аккаунт разбираем?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Один шаг — и через ~минуту готовые сценарии под съёмку.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <Label htmlFor="handle">@ник Instagram или TikTok</Label>
        <Input
          id="handle"
          className="h-12 rounded-xl border-border/80 bg-card text-base"
          placeholder="@username"
          value={socialHandle}
          onChange={(e) => setSocialHandle(e.target.value)}
          autoFocus
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          По умолчанию цель — рост аудитории, тон — прямой. Можно сразу
          запускать.
        </p>
      </section>

      <button
        type="button"
        className="text-left text-sm font-medium text-primary"
        onClick={() => setShowExtras((v) => !v)}
      >
        {showExtras ? "Скрыть настройки" : "Настроить цель, тон и оффер"}
      </button>

      {showExtras && (
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4">
          <div className="space-y-2">
            <Label>Цель</Label>
            <div className="grid gap-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setProfileGoal(goal.id)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    profileGoal === goal.id
                      ? "border-primary bg-primary/5"
                      : "border-border/80 bg-background",
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
                      : "border-border/80 bg-background",
                  )}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer">Что предлагаешь</Label>
            <Textarea
              id="offer"
              className="min-h-[80px] rounded-xl bg-background"
              placeholder="Курс, чеклист, консультация…"
              value={offerSummary}
              onChange={(e) => setOfferSummary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Сайт или ссылка</Label>
            <Input
              id="website"
              className="h-11 rounded-xl bg-background"
              placeholder="https://"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
        </section>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="mt-auto pt-2">
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={() => void submit()}
          disabled={loading}
        >
          {loading ? "Запускаем…" : "Разобрать профиль"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <p className="pb-1 text-center text-[11px]">
        <AppVersion className="text-muted-foreground/70" />
      </p>
    </div>
  );
}
