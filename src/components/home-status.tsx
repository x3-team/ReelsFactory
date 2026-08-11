"use client";

import { Clapperboard, Sparkles } from "lucide-react";

import { TelegramBackButton } from "@/components/telegram/back-button";
import { useTelegram } from "@/components/telegram/telegram-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HomeStatus() {
  const { ready, user, isTelegram, startParam } = useTelegram();

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "Creator";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4 pb-8">
      <TelegramBackButton show={false} />

      <header className="flex items-center gap-3 pt-2">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Clapperboard className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Telegram Mini App
          </p>
          <h1 className="text-xl font-semibold tracking-tight">ReelsFactory</h1>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-4" />
            Phase 1 foundation
          </CardTitle>
          <CardDescription>
            Next.js App Router, Prisma, Tailwind, shadcn/ui, and Telegram SDK
            are wired up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <StatusRow
            label="SDK ready"
            value={ready ? "yes" : "initializing…"}
          />
          <StatusRow
            label="Telegram WebView"
            value={isTelegram ? "detected" : "browser (dev)"}
          />
          <StatusRow label="User" value={ready ? displayName : "—"} />
          <StatusRow
            label="Start param"
            value={startParam ?? "none (ref_* on first launch)"}
          />
        </CardContent>
      </Card>

      <Button className="w-full" disabled>
        Continue to onboarding (Phase 3)
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Models ready: User · ProfileAnalysis · Script · Payment · Referral
      </p>
    </main>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
