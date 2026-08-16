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
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Один суфлёр бесплатно
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed">
            Остальные 30 и 45 секунд — на тарифе. Читаешь с экрана, как с
            телесуфлёра.
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
                  "w-full rounded-2xl border p-4 text-left transition",
                  planId === "PRO"
                    ? "border-primary bg-accent"
                    : "border-border bg-card",
                  active && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{plan.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold">{plan.priceRub} ₽</div>
                    <div className="text-xs text-muted-foreground">/ месяц</div>
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium text-primary">
                  {active
                    ? "Твой тариф"
                    : loadingPlan === planId
                      ? "Открываем оплату…"
                      : "Выбрать"}
                </div>
              </button>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 font-medium">
            <Gift className="size-4 text-primary" />
            Реферал 30 / 10
          </div>
          <p className="text-sm text-muted-foreground">
            30% с первой оплаты друга и 10% с каждого продления. Не кэшбек-лозунг —
            просто ссылка.
          </p>
          <p className="text-sm">
            Баланс: <span className="font-semibold">{referralBalance} ₽</span>
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-2xl"
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
          <p className="break-all text-xs text-muted-foreground">{referralUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
