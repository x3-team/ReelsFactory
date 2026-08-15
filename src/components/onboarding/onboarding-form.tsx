"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Mic } from "lucide-react";

import {
  MIN_SUBMITTED_REELS,
  hasSubmittedReelSignal,
  parseSubmittedReels,
} from "@/lib/submitted-reels";

import { BrandMark } from "@/components/brand/brand-mark";
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
  submittedReelsText?: string;
};

const GOALS = [
  {
    id: "GROW_AUDIENCE" as const,
    title: "Рост аудитории",
    description: "Ролики, которые досматривают и сохраняют — не обещание подписчиков",
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

const PRIMARY_NICHES = NICHE_PRESETS.filter((p) =>
  ["beauty", "realty", "clinic", "coach", "shop", "food"].includes(p.id),
);
const EXTRA_NICHES = NICHE_PRESETS.filter((p) =>
  ["edtech", "smm"].includes(p.id),
);
const CUSTOM_NICHE = NICHE_PRESETS.find((p) => p.id === "custom")!;

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
  const [showExtraNiches, setShowExtraNiches] = useState(false);
  const [profileGoal, setProfileGoal] =
    useState<OnboardingValues["profileGoal"]>("GROW_AUDIENCE");
  const [toneOfVoice, setToneOfVoice] =
    useState<OnboardingValues["toneOfVoice"]>("DIRECT");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showWebsite, setShowWebsite] = useState(false);
  const [offerSummary, setOfferSummary] = useState("");
  const [voiceDraft, setVoiceDraft] = useState("");
  const [submittedReelsText, setSubmittedReelsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsUserReels, setNeedsUserReels] = useState(true);

  useEffect(() => {
    void fetch("/api/health")
      .then((res) => res.json())
      .then((data: { honesty?: { scrape?: boolean; needsUserReels?: boolean } }) => {
        setNeedsUserReels(
          Boolean(data.honesty?.needsUserReels ?? !data.honesty?.scrape),
        );
      })
      .catch(() => setNeedsUserReels(true));
  }, []);

  const totalSteps = 4;

  async function next() {
    setError(null);
    if (step === 0 && socialHandle.trim().length < 2) {
      setError("Укажите @ник — только подпись сценариев, не адрес для скрейпа");
      return;
    }
    if (step === 0) {
      const reels = parseSubmittedReels(submittedReelsText);
      if (needsUserReels && reels.length < MIN_SUBMITTED_REELS) {
        setError(
          `Вставьте ${MIN_SUBMITTED_REELS}–5 ссылок на свои ролики. Разберём только их.`,
        );
        return;
      }
      if (reels.length > 0 && !hasSubmittedReelSignal(reels)) {
        setError(
          "К ссылкам напишите, о чём ролик, или цифру из Insights (просмотры / удержание).",
        );
        return;
      }
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
      submittedReelsText: submittedReelsText.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-4 pb-8">
      <header className="pt-2">
        <BrandMark />
        <p className="mt-4 text-sm text-muted-foreground">Привет, {userName}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Разбор твоих роликов
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
          <Label htmlFor="reels">Ссылки на 3–5 своих рилсов</Label>
          <Textarea
            id="reels"
            placeholder={
              "https://instagram.com/reel/…  торт без сахара, 12 тыс просмотров, 41% удержание\nhttps://youtube.com/shorts/…  колодец под ключ, 8 тыс\nhttps://instagram.com/reel/…  фисташка и малина"
            }
            value={submittedReelsText}
            onChange={(e) => setSubmittedReelsText(e.target.value)}
            rows={6}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Разбираем только эти URL и подписи. К ссылке — о чём ролик и по
            желанию просмотры / удержание из Insights.
            {needsUserReels
              ? " Без ссылок дальше не пойдём."
              : " Ссылки — основной путь."}
          </p>
          <Label htmlFor="handle">@ник — только подпись</Label>
          <Input
            id="handle"
            placeholder="@ник Instagram, TikTok или YouTube"
            value={socialHandle}
            onChange={(e) => setSocialHandle(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            YouTube-канал по @ не открываем. Можно вставить 3–5 URL Shorts или
            видео с подписью — разберём только их, не длинную аналитику.
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <Label>Ниша</Label>
          <div className="grid grid-cols-2 gap-2">
            {PRIMARY_NICHES.map((preset) => (
              <NicheTile
                key={preset.id}
                label={preset.label}
                pain={preset.pain}
                selected={nichePreset === preset.id}
                onClick={() => {
                  setNichePreset(preset.id);
                  if (!offerSummary) setOfferSummary(preset.defaultOffer);
                }}
              />
            ))}
          </div>
          {showExtraNiches && (
            <div className="grid grid-cols-2 gap-2">
              {EXTRA_NICHES.map((preset) => (
                <NicheTile
                  key={preset.id}
                  label={preset.label}
                  pain={preset.pain}
                  selected={nichePreset === preset.id}
                  onClick={() => {
                    setNichePreset(preset.id);
                    if (!offerSummary) setOfferSummary(preset.defaultOffer);
                  }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className="text-xs font-medium text-primary"
            onClick={() => setShowExtraNiches((v) => !v)}
          >
            {showExtraNiches ? "Скрыть дополнительные" : "Ещё ниши"}
          </button>
          <NicheTile
            label={CUSTOM_NICHE.label}
            pain={CUSTOM_NICHE.pain}
            selected={nichePreset === "custom"}
            wide
            onClick={() => setNichePreset("custom")}
          />
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
                  "rounded-2xl border p-4 text-left transition",
                  profileGoal === goal.id
                    ? "border-primary bg-primary/10"
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
                  "min-h-11 rounded-2xl border px-3 py-3 text-sm font-medium",
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
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voice" className="flex items-center gap-2">
              <Mic className="size-3.5" /> Идея своими словами
            </Label>
            <Textarea
              id="voice"
              placeholder="Набросайте, о чём снимаете — или вставьте расшифровку голосового из Telegram. Сожмём в бриф."
              value={voiceDraft}
              onChange={(e) => setVoiceDraft(e.target.value)}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer">Оффер / лидмагнит</Label>
            <Textarea
              id="offer"
              placeholder="Бесплатный чеклист, консультация, курс…"
              value={offerSummary}
              onChange={(e) => setOfferSummary(e.target.value)}
              rows={3}
            />
          </div>
          {showWebsite ? (
            <div className="space-y-2">
              <Label htmlFor="website">Сайт</Label>
              <Input
                id="website"
                placeholder="https://"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          ) : (
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground"
              onClick={() => setShowWebsite(true)}
            >
              + добавить сайт
            </button>
          )}
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
              : "Разобрать мои ролики"
            : "Продолжить"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function NicheTile({
  label,
  pain,
  selected,
  wide,
  onClick,
}: {
  label: string;
  pain: string;
  selected: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[4.5rem] rounded-2xl border px-3 py-3 text-left",
        wide && "col-span-2 w-full",
        selected ? "border-primary bg-primary/10" : "border-border",
      )}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-1 text-xs leading-snug text-muted-foreground">{pain}</div>
    </button>
  );
}
