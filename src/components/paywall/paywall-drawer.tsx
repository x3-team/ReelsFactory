"use client";

import { useState } from "react";
import { Check, Crown, Gift, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import {
  billingPeriodLabel,
  planMonthlyEquivalentRub,
  planPriceRub,
  PLANS,
  YEARLY_BILLED_MONTHS,
  type BillingPeriod,
  type PlanId,
} from "@/lib/config";
import {
  computeReferralCredit,
  REFERRAL_MIN_PAYOUT_RUB,
} from "@/lib/payments/referral-credit";
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
    title: "Откройте суфлёр",
    description:
      "Полный текст в камеру 15 / 30 / 45 сек в этом же сеансе. Подписи под площадки — рядом, не вместо.",
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
      "Больше сценариев с суфлёром и съёмочный день. Оплата в рублях через ЮKassa.",
  },
};

export function PaywallDrawer({
  open,
  onOpenChange,
  referralUrl,
  referralBalance,
  currentPlan,
  userId,
  onSelectPlan,
  loadingPlan,
  reason = "generic",
  onBalanceChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralUrl: string;
  referralBalance: number;
  currentPlan: PlanId;
  userId: string;
  onSelectPlan: (
    plan: Exclude<PlanId, "FREE">,
    billingPeriod: BillingPeriod,
  ) => Promise<void> | void;
  loadingPlan?: string | null;
  reason?: PaywallReason;
  onBalanceChange?: (balance: number) => void;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("month");
  const [copied, setCopied] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState(
    String(Math.max(REFERRAL_MIN_PAYOUT_RUB, Math.floor(referralBalance))),
  );
  const [requisites, setRequisites] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutOk, setPayoutOk] = useState<string | null>(null);
  const copy = COPY[reason] || COPY.generic;

  async function copyReferral() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function submitPayout() {
    setPayoutError(null);
    setPayoutOk(null);
    setPayoutBusy(true);
    try {
      const amount = Number(payoutAmount.replace(",", "."));
      const data = await api<{ balance: number }>(
        "/api/referrals/payout",
        {
          method: "POST",
          body: JSON.stringify({
            userId,
            amount,
            requisites,
          }),
        },
      );
      onBalanceChange?.(data.balance);
      setPayoutOk("Заявка на вывод принята. Переведём вручную после проверки.");
      setRequisites("");
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : "Не удалось создать заявку");
    } finally {
      setPayoutBusy(false);
    }
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

        <div
          role="group"
          aria-label="Период оплаты"
          className="flex rounded-2xl border border-border/80 p-1"
        >
          {(["month", "year"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
                period === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {value === "month" ? "Помесячно" : "На год"}
              {value === "year" ? (
                <span
                  className={cn(
                    "ml-1.5 text-[11px]",
                    period === "year" ? "opacity-80" : "text-primary",
                  )}
                >
                  −{12 - YEARLY_BILLED_MONTHS} мес
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {period === "year" ? (
          <p className="-mt-1 text-xs text-muted-foreground">
            Год по цене {YEARLY_BILLED_MONTHS} месяцев — два месяца в подарок.
          </p>
        ) : null}

        <div className="space-y-2">
          {(["START", "PRO", "AGENCY"] as const).map((planId) => {
            const plan = PLANS[planId];
            const active = currentPlan === planId;
            const recommended = planId === "PRO";
            const price = planPriceRub(planId, period);
            const split = computeReferralCredit(price, referralBalance);
            return (
              <button
                key={planId}
                type="button"
                disabled={!!loadingPlan || active}
                onClick={() => void onSelectPlan(planId, period)}
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
                    {split.credit > 0 ? (
                      <>
                        <div className="text-xs text-muted-foreground line-through">
                          {price} ₽
                        </div>
                        <div className="font-display text-lg font-semibold">
                          {split.fullyCovered ? "0 ₽" : `${split.charge} ₽`}
                        </div>
                        <div className="text-[11px] text-primary">
                          −{split.credit} ₽ с баланса
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-display text-lg font-semibold">
                          {price} ₽
                        </div>
                        <div className="text-xs text-muted-foreground">
                          / {billingPeriodLabel(period)}
                        </div>
                        {period === "year" ? (
                          <div className="text-[11px] text-primary">
                            {planMonthlyEquivalentRub(planId)} ₽ / мес
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium text-primary">
                  {active
                    ? "Текущий план"
                    : loadingPlan === planId
                      ? "Создаём оплату…"
                      : split.fullyCovered
                        ? "Оплатить с баланса"
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
            {referralBalance > 0 ? " — спишется при оплате тарифа" : ""}
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

        <div className="space-y-3 rounded-2xl border border-border/80 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="size-4 text-primary" />
            Вывод рефералки
          </div>
          <p className="text-xs text-muted-foreground">
            От {REFERRAL_MIN_PAYOUT_RUB} ₽. Заявка уходит в обработку, перевод
            вручную по реквизитам.
          </p>
          <div className="space-y-1">
            <Label htmlFor="payout-amount">Сумма, ₽</Label>
            <Input
              id="payout-amount"
              inputMode="decimal"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payout-req">Карта / СБП / телефон</Label>
            <Textarea
              id="payout-req"
              rows={3}
              placeholder="Номер карты или телефон СБП, ФИО"
              value={requisites}
              onChange={(e) => setRequisites(e.target.value)}
            />
          </div>
          {payoutError ? (
            <p className="text-sm text-destructive">{payoutError}</p>
          ) : null}
          {payoutOk ? (
            <p className="text-sm text-primary">{payoutOk}</p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={payoutBusy || referralBalance < REFERRAL_MIN_PAYOUT_RUB}
            onClick={() => void submitPayout()}
          >
            {payoutBusy ? "Отправляем…" : "Оставить заявку"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
