"use client";

import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PLANS, type PlanId } from "@/lib/config";
import { cn } from "@/lib/utils";

export function PaywallDrawer({
  open,
  onOpenChange,
  referralUrl,
  referralBalance,
  currentPlan,
  onSelectPlan,
  loadingPlan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralUrl: string;
  referralBalance: number;
  currentPlan: PlanId;
  onSelectPlan: (plan: Exclude<PlanId, "FREE">) => Promise<void> | void;
  loadingPlan?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copyReferral() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto">
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Открыть все сценарии
          </DialogTitle>
          <DialogDescription>
            Бесплатно — аудит и 1 тизер. Подписка даёт полный суфлёр и больше
            сценариев.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(["START", "PRO", "AGENCY"] as const).map((planId) => {
            const plan = PLANS[planId];
            const active = currentPlan === planId;
            const recommended = planId === "START";
            return (
              <button
                key={planId}
                type="button"
                disabled={!!loadingPlan || active}
                onClick={() => void onSelectPlan(planId)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  recommended
                    ? "border-primary bg-primary/5"
                    : "border-border/80 bg-card",
                  active && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{plan.name}</span>
                      {recommended && (
                        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                          Хит
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{plan.priceRub} ₽</div>
                    <div className="text-xs text-muted-foreground">/ мес</div>
                  </div>
                </div>
                <div className="mt-3 text-sm font-semibold text-primary">
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

        <Separator />

        <div className="space-y-3 rounded-2xl border border-border/80 bg-secondary/40 p-4">
          <div className="flex items-center gap-2 font-semibold">
            <Gift className="size-4 text-primary" />
            Рефералка
          </div>
          <p className="text-sm text-muted-foreground">
            30% с первой оплаты друга и 10% с каждого продления.
          </p>
          <p className="text-sm">
            Баланс: <span className="font-semibold">{referralBalance} ₽</span>
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
              <>
                <Copy className="size-4" /> Скопировать ссылку
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
