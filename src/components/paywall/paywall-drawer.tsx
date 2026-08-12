"use client";

import { useState } from "react";
import { Check, Crown, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLANS, type PlanId } from "@/lib/config";
import { cn } from "@/lib/utils";

export type PaywallReason =
  | "scripts"
  | "studio"
  | "funnel"
  | "shoot"
  | "calendar"
  | "generic";

const COPY: Record<PaywallReason, { title: string; description: string }> = {
  scripts: {
    title: "Откройте суфлёр и кросс‑пакет",
    description:
      "Полные сценарии 15 / 30 / 45 сек, подписи под Reels, VK и Telegram.",
  },
  studio: {
    title: "Студия: ремейк и разбор",
    description:
      "Переснимите чужой вирус под себя и разберите, почему ролик не залетел.",
  },
  funnel: {
    title: "Воронка коммент → Telegram",
    description: "Ключевое слово, ответ бота и лидмагнит к каждому ролику.",
  },
  shoot: {
    title: "План съёмочного дня",
    description: "Один образ, порядок дублей и пропы — снял пачку за полтора часа.",
  },
  calendar: {
    title: "Календарь на 7 дней",
    description: "Доверие, экспертность, оффер и соцдок без ежедневной пустоты.",
  },
  generic: {
    title: "Снимите лимиты",
    description:
      "Больше сценариев, съёмочный день и пакет под Reels, VK и Telegram.",
  },
};

export function PaywallDrawer({
  open,
  onOpenChange,
  referralUrl,
  referralBalance,
  currentPlan,
  onSelectPlan,
  loadingPlan,
  reason = "generic",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralUrl: string;
  referralBalance: number;
  currentPlan: PlanId;
  onSelectPlan: (plan: Exclude<PlanId, "FREE">) => Promise<void> | void;
  loadingPlan?: string | null;
  reason?: PaywallReason;
}) {
  const [copied, setCopied] = useState(false);
  const copy = COPY[reason] || COPY.generic;

  async function copyReferral() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto max-h-[90dvh] w-full max-w-md translate-y-0 gap-4 overflow-y-auto rounded-b-none rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom">
        <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Crown className="size-5 text-primary" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {(["START", "PRO", "AGENCY"] as const).map((planId) => {
            const plan = PLANS[planId];
            const active = currentPlan === planId;
            const recommended = planId === "PRO";
            return (
              <button
                key={planId}
                type="button"
                disabled={!!loadingPlan || active}
                onClick={() => void onSelectPlan(planId)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  recommended
                    ? "border-primary bg-primary/10"
                    : "border-border",
                  active && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{plan.name}</span>
                      {recommended && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                          Рекомендуем
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-lg font-semibold">
                      {plan.priceRub} ₽
                    </div>
                    <div className="text-xs text-muted-foreground">/ месяц</div>
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium text-primary">
                  {active
                    ? "Текущий план"
                    : loadingPlan === planId
                      ? "Создаём оплату…"
                      : "Выбрать"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 rounded-2xl border border-border/80 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gift className="size-4 text-primary" />
            Приведи друга · 30% + 10%
          </div>
          <p className="text-sm text-muted-foreground">
            Баланс:{" "}
            <span className="font-semibold text-foreground">
              {referralBalance} ₽
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void copyReferral()}
          >
            {copied ? (
              <>
                <Check className="size-4" /> Скопировано
              </>
            ) : (
              "Скопировать реферальную ссылку"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
