export const PLANS = {
  FREE: {
    id: "FREE" as const,
    name: "Бесплатно",
    priceRub: 0,
    scriptsPerMonth: 1,
    maxClientAccounts: 0,
    description: "Аудит профиля + 1 тизер-сценарий",
  },
  START: {
    id: "START" as const,
    name: "Старт",
    priceRub: 590,
    scriptsPerMonth: 12,
    maxClientAccounts: 0,
    description: "12 сценариев / месяц · полный суфлёр · 1 столп",
  },
  PRO: {
    id: "PRO" as const,
    name: "Про",
    priceRub: 1990,
    scriptsPerMonth: 30,
    maxClientAccounts: 0,
    description: "30 сценариев / месяц · конкуренты · посты для Telegram",
  },
  AGENCY: {
    id: "AGENCY" as const,
    name: "Агентство",
    priceRub: 4990,
    scriptsPerMonth: 100,
    maxClientAccounts: 5,
    description: "До 5 клиентских аккаунтов · командный объём",
  },
} as const;

export type PlanId = keyof typeof PLANS;

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
