export const PLANS = {
  FREE: {
    id: "FREE" as const,
    name: "Бесплатно",
    priceRub: 0,
    scriptsPerMonth: 3,
    packsPerMonth: 1,
    maxClientAccounts: 0,
    forSale: false,
    description: "1 разбор в месяц · один полный суфлёр, остальные закрыты",
  },
  START: {
    id: "START" as const,
    name: "Старт",
    priceRub: 590,
    scriptsPerMonth: 12,
    packsPerMonth: 4,
    maxClientAccounts: 0,
    forSale: true,
    description: "4 разбора в месяц · 12 сценариев · все длины · суфлёр",
  },
  PRO: {
    id: "PRO" as const,
    name: "Про",
    priceRub: 1990,
    scriptsPerMonth: 30,
    packsPerMonth: 10,
    maxClientAccounts: 0,
    forSale: true,
    description: "10 разборов в месяц · 30 сценариев · модель terra · все длины",
  },
  AGENCY: {
    id: "AGENCY" as const,
    name: "Агентство",
    priceRub: 4990,
    scriptsPerMonth: 100,
    packsPerMonth: 33,
    maxClientAccounts: 5,
    forSale: false,
    description: "Пока не продаём — до 5 клиентских аккаунтов, в разработке",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const CHECKOUT_PLANS = (Object.keys(PLANS) as PlanId[]).filter(
  (id) => PLANS[id].forSale,
);

export const PAYMENTS_UNAVAILABLE_MESSAGE =
  "Оплата временно недоступна. Напишите в поддержку — не списываем карту без ЮKassa.";

export const AGENCY_NOT_FOR_SALE_MESSAGE =
  "Тариф «Агентство» пока не продаём — он ещё в разработке.";

/** 30% с первой оплаты приглашённого */
export const REFERRAL_FIRST_COMMISSION_RATE = 0.3;
/** 10% с продлений */
export const REFERRAL_RENEWAL_COMMISSION_RATE = 0.1;

/** @deprecated use REFERRAL_FIRST_COMMISSION_RATE */
export const REFERRAL_COMMISSION_RATE = REFERRAL_FIRST_COMMISSION_RATE;

/** Default true: live scrape/LLM only when MOCK_EXTERNAL_APIS=false. */
export function isMockMode() {
  return process.env.MOCK_EXTERNAL_APIS !== "false";
}

export function livePaymentsConfigured() {
  return Boolean(
    process.env.YOOKASSA_SHOP_ID &&
      process.env.YOOKASSA_SECRET_KEY &&
      !isMockMode(),
  );
}

/** Mock checkout only outside production. In production without keys — refuse. */
export function mockPaymentsAllowed() {
  return process.env.NODE_ENV !== "production";
}

export function paymentsEnabled() {
  return livePaymentsConfigured() || mockPaymentsAllowed();
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
