"use client";

import { useState } from "react";
import { ArrowRight, Clapperboard } from "lucide-react";

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
    title: "Grow Audience",
    description: "More followers, saves, and reach",
  },
  {
    id: "SELL_PRODUCT" as const,
    title: "Sell Product / Service",
    description: "Scripts that drive comments and DMs",
  },
];

const TONES = [
  { id: "DIRECT" as const, label: "Direct" },
  { id: "HUMOROUS" as const, label: "Humorous" },
  { id: "EXPERT" as const, label: "Expert" },
  { id: "STORYTELLING" as const, label: "Storytelling" },
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
      setError("Enter an Instagram/TikTok @username or YouTube link");
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-4 pb-8">
      <header className="pt-2">
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Clapperboard className="size-5" />
        </div>
        <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your content engine
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step + 1} of 3
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
          <Label htmlFor="handle">Instagram / TikTok / YouTube</Label>
          <Input
            id="handle"
            placeholder="@username or channel URL"
            value={socialHandle}
            onChange={(e) => setSocialHandle(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll scan bio + top 5 videos to extract viral hooks.
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <Label>Profile goal</Label>
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

          <Label className="pt-2">Tone of voice</Label>
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
            <Label htmlFor="offer">Offer summary (optional)</Label>
            <Textarea
              id="offer"
              placeholder="Free checklist, consultation, course…"
              value={offerSummary}
              onChange={(e) => setOfferSummary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website URL (optional)</Label>
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
            Back
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          onClick={() => void next()}
          disabled={loading}
        >
          {step === 2 ? (loading ? "Starting…" : "Analyze profile") : "Continue"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
