export const PLANS = {
  FREE: {
    id: "FREE" as const,
    name: "Бесплатно",
    priceRub: 0,
    scriptsPerMonth: 1,
    maxClientAccounts: 0,
    description: "Разбор профиля + 1 полный сценарий с суфлёром",
  },
  START: {
    id: "START" as const,
    name: "Старт",
    priceRub: 590,
    scriptsPerMonth: 12,
    maxClientAccounts: 0,
    description: "12 сценариев в месяц · суфлёр · темы для контент-плана",
  },
  PRO: {
    id: "PRO" as const,
    name: "Про",
    priceRub: 1990,
    scriptsPerMonth: 30,
    maxClientAccounts: 0,
    description: "30 сценариев в месяц · разбор конкурентов · посты в Telegram",
  },
  AGENCY: {
    id: "AGENCY" as const,
    name: "Агентство",
    priceRub: 4990,
    scriptsPerMonth: 100,
    maxClientAccounts: 5,
    description: "До 5 аккаунтов клиентов · большой объём сценариев",
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type BillingPeriod = "month" | "year";

/** Разовый пакет: открыть ещё 3 сценария без подписки */
export const SCRIPT_PACK = {
  id: "SCRIPT_PACK" as const,
  name: "Ещё 3 сценария",
  priceRub: 390,
  description: "Разово открыть 3 сценария текущего разбора — без подписки",
};

/** Год = цена 10 месяцев (скидка ~17%, «2 месяца в подарок») */
export const YEARLY_BILLED_MONTHS = 10;

export function planPriceRub(
  planId: Exclude<PlanId, "FREE">,
  period: BillingPeriod = "month",
) {
  const monthly = PLANS[planId].priceRub;
  if (period === "year") return monthly * YEARLY_BILLED_MONTHS;
  return monthly;
}

/** Эквивалент в месяц при годовой оплате */
export function planMonthlyEquivalentRub(planId: Exclude<PlanId, "FREE">) {
  return Math.round(planPriceRub(planId, "year") / 12);
}

export function billingPeriodDays(period: BillingPeriod) {
  return period === "year" ? 365 : 30;
}

export function billingPeriodLabel(period: BillingPeriod) {
  return period === "year" ? "год" : "мес";
}

/** 30% с первой оплаты приглашённого */
export const REFERRAL_FIRST_COMMISSION_RATE = 0.3;
/** 10% с продлений */
export const REFERRAL_RENEWAL_COMMISSION_RATE = 0.1;

/** @deprecated use REFERRAL_FIRST_COMMISSION_RATE */
export const REFERRAL_COMMISSION_RATE = REFERRAL_FIRST_COMMISSION_RATE;

export function isMockMode() {
  if (process.env.MOCK_EXTERNAL_APIS === "true") return true;
  if (process.env.MOCK_EXTERNAL_APIS === "false") return false;
  return !process.env.AITUNNEL_API_KEY && !process.env.OPENAI_API_KEY;
}

export function botUsername() {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "ReelsFactoryBot";
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function referralLink(telegramId: string | number | bigint) {
  return `https://t.me/${botUsername()}?start=ref_${telegramId}`;
}

export function telegramShareUrl(url: string, text?: string) {
  const params = new URLSearchParams({ url });
  if (text) params.set("text", text);
  return `https://t.me/share/url?${params.toString()}`;
}
