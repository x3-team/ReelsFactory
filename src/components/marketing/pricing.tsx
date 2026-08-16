import { Check } from "lucide-react";

import { CtaLink, Section, SectionHeading } from "@/components/marketing/primitives";
import {
  PLANS,
  REFERRAL_FIRST_COMMISSION_RATE,
  REFERRAL_RENEWAL_COMMISSION_RATE,
  type PlanId,
} from "@/lib/config";
import { cn } from "@/lib/utils";

const FEATURES: Record<PlanId, string[]> = {
  FREE: [
    "Разбор профиля целиком",
    "Один сценарий с суфлёром",
    "Полный текст, а не обрывок",
  ],
  START: [
    `${PLANS.START.scriptsPerMonth} сценариев в месяц`,
    "Все три длины: 15 / 30 / 45",
    "Суфлёр без ограничений",
  ],
  PRO: [
    `${PLANS.PRO.scriptsPerMonth} сценариев в месяц`,
    "Модель помощнее на разборе и тексте",
    "Всё из «Старта»",
  ],
  AGENCY: [
    `${PLANS.AGENCY.scriptsPerMonth} сценариев в месяц`,
    `До ${PLANS.AGENCY.maxClientAccounts} клиентских аккаунтов`,
    "Свой разбор под каждый аккаунт",
    "Всё из «Про»",
  ],
};

const ORDER: PlanId[] = ["FREE", "START", "PRO", "AGENCY"];

export function Pricing() {
  return (
    <Section id="pricing" tone="clay">
      <SectionHeading
        eyebrow="Тарифы"
        title="Рубли, помесячно, без годовых обязательств"
        lead="Начинаешь с бесплатного разбора. Тариф нужен, когда одного суфлёра в месяц уже мало."
      />

      <div className="mt-12 grid gap-4 lg:grid-cols-4">
        {ORDER.map((planId) => {
          const plan = PLANS[planId];
          const highlighted = planId === "PRO";
          return (
            <article
              key={planId}
              className={cn(
                "flex flex-col gap-6 rounded-[1.8rem] border p-7",
                highlighted
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/12 bg-cream",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "type-eyebrow",
                    highlighted ? "text-signal" : "text-ink/40",
                  )}
                >
                  {plan.name}
                </p>
                {highlighted ? (
                  <span className="rounded-full bg-signal px-2.5 py-1 text-[0.7rem] font-semibold text-ink">
                    Чаще берут
                  </span>
                ) : null}
              </div>

              <div>
                <p className="font-display text-[2.25rem] font-bold leading-none tracking-[-0.05em] xl:text-[2.5rem]">
                  {plan.priceRub === 0 ? "0 ₽" : `${plan.priceRub} ₽`}
                </p>
                <p
                  className={cn(
                    "mt-2 text-[0.82rem]",
                    highlighted ? "text-cream/50" : "text-ink/40",
                  )}
                >
                  {plan.priceRub === 0 ? "без карты и подписки" : "в месяц"}
                </p>
              </div>

              <ul className="flex flex-col gap-3">
                {FEATURES[planId].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        highlighted ? "text-signal" : "text-primary",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[0.92rem] leading-snug",
                        highlighted ? "text-cream/85" : "text-ink/70",
                      )}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <CtaLink
                href="/app"
                size="sm"
                tone={highlighted ? "cream" : planId === "FREE" ? "outline" : "ink"}
                className="mt-auto w-full"
              >
                {planId === "FREE" ? "Начать бесплатно" : "Выбрать"}
              </CtaLink>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-6 rounded-[1.8rem] border border-ink/12 bg-cream p-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-10 lg:p-9">
        <p className="font-display text-[3rem] font-bold leading-none tracking-[-0.05em] text-primary">
          {Math.round(REFERRAL_FIRST_COMMISSION_RATE * 100)} /{" "}
          {Math.round(REFERRAL_RENEWAL_COMMISSION_RATE * 100)}
        </p>
        <div>
          <h3 className="type-h3 font-display">Реферальная ссылка</h3>
          <p className="mt-2 max-w-[60ch] text-[0.98rem] leading-relaxed text-ink/65">
            {Math.round(REFERRAL_FIRST_COMMISSION_RATE * 100)}% с первой оплаты
            того, кого привёл, и{" "}
            {Math.round(REFERRAL_RENEWAL_COMMISSION_RATE * 100)}% с каждого его
            продления. Ссылка лежит прямо под карточками сценариев — делиться
            можно тем же экраном, с которого снимаешь.
          </p>
        </div>
        <CtaLink href="/app" size="sm" tone="outline" className="lg:shrink-0">
          Забрать ссылку
        </CtaLink>
      </div>
    </Section>
  );
}
