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
import {
  PLANS,
  SCRIPT_PACK,
  planMonthlyEquivalentRub,
  planPriceRub,
  type BillingPeriod,
  type PlanId,
} from "@/lib/config";
import { cn } from "@/lib/utils";

export function PaywallDrawer({
  open,
  onOpenChange,
  referralUrl,
  referralBalance,
  currentPlan,
  onSelectPlan,
  onBuyScriptPack,
  loadingPlan,
  showScriptPack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralUrl: string;
  referralBalance: number;
  currentPlan: PlanId;
  onSelectPlan: (
    plan: Exclude<PlanId, "FREE">,
    billingPeriod: BillingPeriod,
  ) => Promise<void> | void;
  onBuyScriptPack?: () => void;
  loadingPlan?: string | null;
  showScriptPack?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");

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
            Бесплатно — аудит и 1 полный сценарий. Подписка открывает все
            сценарии и суфлёр без ограничений.
          </DialogDescription>
        </DialogHeader>

        {showScriptPack && onBuyScriptPack ? (
          <button
            type="button"
            disabled={!!loadingPlan}
            onClick={() => onBuyScriptPack()}
            className="w-full rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition hover:bg-primary/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{SCRIPT_PACK.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {SCRIPT_PACK.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">
                  {SCRIPT_PACK.priceRub.toLocaleString("ru-RU")} ₽
                </p>
                <p className="text-xs text-muted-foreground">разово</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-primary">
              {loadingPlan === "SCRIPT_PACK" ? "Создаём оплату…" : "Купить пакет"}
            </p>
          </button>
        ) : null}

        <div className="grid grid-cols-2 rounded-2xl bg-secondary/80 p-1">
          {(
            [
              { id: "month" as const, label: "Месяц" },
              { id: "year" as const, label: "Год", hint: "+2 мес" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setBillingPeriod(item.id)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                billingPeriod === item.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
              {"hint" in item && item.hint ? (
                <span
                  className={cn(
                    "ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                    billingPeriod === item.id
                      ? "bg-primary/10 text-primary"
                      : "bg-primary/5 text-primary/80",
                  )}
                >
                  {item.hint}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {billingPeriod === "year" && (
          <p className="text-center text-[13px] leading-5 text-muted-foreground">
            Платите за 10 месяцев —{" "}
            <span className="font-medium text-foreground">
              2 месяца в подарок
            </span>
          </p>
        )}

        <div className="space-y-3">
          {(["START", "PRO", "AGENCY"] as const).map((planId) => {
            const plan = PLANS[planId];
            const active = currentPlan === planId;
            const recommended = planId === "START";
            const price = planPriceRub(planId, billingPeriod);
            const perMonth =
              billingPeriod === "year"
                ? planMonthlyEquivalentRub(planId)
                : plan.priceRub;
            return (
              <button
                key={planId}
                type="button"
                disabled={!!loadingPlan || active}
                onClick={() => void onSelectPlan(planId, billingPeriod)}
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
                        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                          Хит
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {price.toLocaleString("ru-RU")} ₽
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {billingPeriod === "year"
                        ? `≈ ${perMonth.toLocaleString("ru-RU")} ₽/мес`
                        : "/ мес"}
                    </div>
                    {billingPeriod === "year" && (
                      <div className="mt-1 text-[11px] font-medium text-primary">
                        2 мес в подарок
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-sm font-semibold text-primary">
                  {active
                    ? "Текущий план"
                    : loadingPlan === `${planId}:${billingPeriod}` ||
                        loadingPlan === planId
                      ? "Создаём оплату…"
                      : billingPeriod === "year"
                        ? "Выбрать на год"
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
