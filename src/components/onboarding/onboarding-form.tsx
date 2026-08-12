"use client";

import { useState } from "react";
import { ArrowRight, Clapperboard, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NICHE_PRESETS, type NichePresetId } from "@/lib/niche-presets";
import { cn } from "@/lib/utils";

export type OnboardingValues = {
  socialHandle: string;
  profileGoal: "GROW_AUDIENCE" | "SELL_PRODUCT";
  toneOfVoice: "DIRECT" | "HUMOROUS" | "EXPERT" | "STORYTELLING";
  websiteUrl?: string;
  offerSummary?: string;
  nichePreset?: NichePresetId;
  voiceDraft?: string;
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
    description: "Сценарии, которые ведут к комментариям и Telegram",
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
  onSubmit,
}: {
  userName: string;
  loading?: boolean;
  onSubmit: (values: OnboardingValues) => Promise<void> | void;
}) {
  const [step, setStep] = useState(0);
  const [socialHandle, setSocialHandle] = useState("");
  const [nichePreset, setNichePreset] = useState<NichePresetId>("custom");
  const [profileGoal, setProfileGoal] =
    useState<OnboardingValues["profileGoal"]>("GROW_AUDIENCE");
  const [toneOfVoice, setToneOfVoice] =
    useState<OnboardingValues["toneOfVoice"]>("DIRECT");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [offerSummary, setOfferSummary] = useState("");
  const [voiceDraft, setVoiceDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4;

  async function next() {
    setError(null);
    if (step === 0 && socialHandle.trim().length < 2) {
      setError("Укажите @username Instagram/TikTok или ссылку на YouTube");
      return;
    }
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
    const preset = NICHE_PRESETS.find((p) => p.id === nichePreset);
    await onSubmit({
      socialHandle: socialHandle.trim(),
      profileGoal,
      toneOfVoice,
      websiteUrl: websiteUrl.trim() || undefined,
      offerSummary:
        offerSummary.trim() ||
        (preset && preset.id !== "custom" ? preset.defaultOffer : undefined),
      nichePreset,
      voiceDraft: voiceDraft.trim() || undefined,
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
          Настроим контент‑машину
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Шаг {step + 1} из {totalSteps}
        </p>
        <div className="mt-3 flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
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
          <Label htmlFor="handle">Instagram / TikTok / YouTube</Label>
          <Input
            id="handle"
            placeholder="@username или ссылка на канал"
            value={socialHandle}
            onChange={(e) => setSocialHandle(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Разберём био и топ‑видео, соберём пакет под Reels, VK Клипы и Telegram.
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <Label>Ниша (пресет для СНГ)</Label>
          <div className="grid grid-cols-2 gap-2">
            {NICHE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setNichePreset(preset.id);
                  if (!offerSummary && preset.id !== "custom") {
                    setOfferSummary(preset.defaultOffer);
                  }
                }}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm",
                  nichePreset === preset.id
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {preset.pain}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
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

      {step === 3 && (
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="offer">Оффер / лидмагнит</Label>
            <Textarea
              id="offer"
              placeholder="Бесплатный чеклист, консультация, курс…"
              value={offerSummary}
              onChange={(e) => setOfferSummary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voice" className="flex items-center gap-2">
              <Mic className="size-3.5" /> Идея голосом / черновик
            </Label>
            <Textarea
              id="voice"
              placeholder="Вставьте расшифровку голосового из Telegram или набросайте идею своими словами…"
              value={voiceDraft}
              onChange={(e) => setVoiceDraft(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              В Mini App удобно надиктовать в чат боту и вставить текст сюда — мы сожмём в бриф.
            </p>
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

      {error && <p className="text-sm text-destructive">{error}</p>}

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
          {step === totalSteps - 1
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
