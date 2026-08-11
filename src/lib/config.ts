export const PLANS = {
  FREE: {
    id: "FREE" as const,
    name: "Бесплатно",
    priceRub: 0,
    scriptsPerMonth: 1,
    description: "Аудит профиля + 1 тизер-сценарий",
  },
  START: {
    id: "START" as const,
    name: "Старт",
    priceRub: 590,
    scriptsPerMonth: 12,
    description: "12 сценариев / месяц · полный суфлёр",
  },
  PRO: {
    id: "PRO" as const,
    name: "Про",
    priceRub: 1990,
    scriptsPerMonth: 30,
    description: "30 сценариев / месяц · анализ конкурентов",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const REFERRAL_COMMISSION_RATE = 0.3;

export function isMockMode() {
  if (process.env.MOCK_EXTERNAL_APIS === "true") return true;
  if (process.env.MOCK_EXTERNAL_APIS === "false") return false;
  // Auto-mock when no AI/scraping keys are configured
  return !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY;
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
