"use client";

import { useState } from "react";
import { Check, Copy, Gift, Crown } from "lucide-react";

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
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="size-5" />
            Открыть все сценарии
          </DialogTitle>
          <DialogDescription>
            В бесплатной версии — аудит и 1 тизер. Подписка даёт полный доступ к
            суфлёру.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(["START", "PRO", "AGENCY"] as const).map((planId) => {
            const plan = PLANS[planId];
            const active = currentPlan === planId;
            return (
              <button
                key={planId}
                type="button"
                disabled={!!loadingPlan || active}
                onClick={() => void onSelectPlan(planId)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition",
                  planId === "PRO" || planId === "AGENCY"
                    ? "border-primary bg-primary/5"
                    : "border-border",
                  active && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{plan.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {plan.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{plan.priceRub} ₽</div>
                    <div className="text-xs text-muted-foreground">/ месяц</div>
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium">
                  {active
                    ? "Текущий план"
                    : loadingPlan === planId
                      ? "Создаём оплату…"
                      : "Выбрать план"}
                </div>
              </button>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-2 font-medium">
            <Gift className="size-4" />
            Реферальная программа
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
                <Copy className="size-4" /> Скопировать реферальную ссылку
              </>
            )}
          </Button>
          <p className="break-all text-xs text-muted-foreground">{referralUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
