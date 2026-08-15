/**
 * Honesty policy: never let a live model write confident copy about a
 * fabricated profile. Live LLM + mock scrape is the most misleading failure.
 */

export type ProfileSource = "live" | "mock" | "user";

export type AnalyzeIntent = {
  hasUserReels?: boolean;
};

export type HonestyMode = "live" | "demo" | "blocked";

export type HonestyEnv = Record<string, string | undefined>;

export type HonestySnapshot = {
  mode: HonestyMode;
  scrape: boolean;
  ai: boolean;
  payments: boolean;
  allowMockProfile: boolean;
  forceMockAi: boolean;
  warning: string | null;
};

export const NO_SCRAPE_LIVE_MESSAGE =
  "Нет ключа скрейпинга (APIFY_TOKEN или RAPIDAPI_KEY). Чтобы не выдумывать аккаунт, вставьте 3–5 ссылок на свои рилсы — можно с цифрами из Insights. Для демо задайте ALLOW_MOCK_PROFILE=true.";

export const YOUTUBE_UNSUPPORTED_MESSAGE =
  "YouTube пока не разбираем. Укажите открытый Instagram или TikTok.";

export const TIKTOK_NEEDS_APIFY_MESSAGE =
  "TikTok нужен APIFY_TOKEN. RapidAPI умеет только Instagram.";

export const SCRAPE_FAILED_MESSAGE =
  "Не удалось разобрать этот аккаунт. Проверьте, что профиль открытый и в нём есть Reels.";

export const LIVE_ON_MOCK_MESSAGE =
  "Демо-профиль нельзя разбирать живой моделью — получится уверенный текст про выдуманный аккаунт.";

export class HonestyError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = "HONESTY", status = 503) {
    super(message);
    this.name = "HonestyError";
    this.code = code;
    this.status = status;
  }
}

export function envHasAi(env: HonestyEnv = process.env) {
  return Boolean(env.AITUNNEL_API_KEY || env.OPENAI_API_KEY);
}

export function envHasScraping(env: HonestyEnv = process.env) {
  return Boolean(env.APIFY_TOKEN || env.APIFY_API_TOKEN || env.RAPIDAPI_KEY);
}

export function envHasApify(env: HonestyEnv = process.env) {
  return Boolean(env.APIFY_TOKEN || env.APIFY_API_TOKEN);
}

export function envHasPayments(env: HonestyEnv = process.env) {
  return Boolean(env.YOOKASSA_SHOP_ID && env.YOOKASSA_SECRET_KEY);
}

export function envForcesAllMock(env: HonestyEnv = process.env) {
  return env.MOCK_EXTERNAL_APIS === "true";
}

/**
 * Demo profile is allowed only when asked for, or when nothing live exists.
 * An AI key without a scrape key is NOT enough — that is the lie.
 */
export function allowMockProfile(env: HonestyEnv = process.env) {
  if (env.ALLOW_MOCK_PROFILE === "true") return true;
  if (envForcesAllMock(env)) return true;
  return !envHasAi(env) && !envHasScraping(env);
}

export function canScrapePlatform(
  platform: string | null | undefined,
  env: HonestyEnv = process.env,
) {
  if (envForcesAllMock(env)) return false;
  const p = (platform || "").toLowerCase();
  if (p === "youtube") return false;
  if (p === "tiktok") return envHasApify(env);
  return envHasScraping(env);
}

export function resolveHonesty(env: HonestyEnv = process.env): HonestySnapshot {
  const scrape = envHasScraping(env);
  const ai = envHasAi(env);
  const payments = envHasPayments(env);
  const allow = allowMockProfile(env);

  if (envForcesAllMock(env)) {
    return {
      mode: "demo",
      scrape: false,
      ai: false,
      payments: false,
      allowMockProfile: true,
      forceMockAi: true,
      warning:
        "MOCK_EXTERNAL_APIS=true — все внешние вызовы заменены демо-ответами.",
    };
  }

  if (scrape) {
    return {
      mode: "live",
      scrape,
      ai,
      payments,
      allowMockProfile: allow,
      forceMockAi: !ai,
      warning: ai
        ? null
        : "Скрейп живой, AI нет — стратегия и суфлёр будут демо.",
    };
  }

  if (allow) {
    return {
      mode: "demo",
      scrape: false,
      ai: false,
      payments,
      allowMockProfile: true,
      forceMockAi: true,
      warning:
        "Профиль не скрейпили. Сценарии не про введённый аккаунт — это каркас, не аудит.",
    };
  }

  return {
    mode: "blocked",
    scrape: false,
    ai,
    payments,
    allowMockProfile: false,
    forceMockAi: true,
    warning: NO_SCRAPE_LIVE_MESSAGE,
  };
}

export function assertCanAnalyzeProfile(
  platform?: string | null,
  env: HonestyEnv = process.env,
  intent: AnalyzeIntent = {},
) {
  const honesty = resolveHonesty(env);
  const p = (platform || "").toLowerCase();

  if (p === "youtube" && !honesty.allowMockProfile) {
    throw new HonestyError(YOUTUBE_UNSUPPORTED_MESSAGE, "YOUTUBE", 400);
  }

  if (honesty.mode === "blocked" && !intent.hasUserReels) {
    throw new HonestyError(NO_SCRAPE_LIVE_MESSAGE, "NO_SCRAPE", 503);
  }

  if (
    p === "tiktok" &&
    !canScrapePlatform("tiktok", env) &&
    !honesty.allowMockProfile &&
    !intent.hasUserReels
  ) {
    throw new HonestyError(TIKTOK_NEEDS_APIFY_MESSAGE, "TIKTOK", 503);
  }

  return honesty;
}

export function isMockScrapedProfile(profile: {
  source?: string | null;
  topVideos?: Array<{ id?: string; audioUrl?: string | null }>;
}) {
  if (profile.source === "mock") return true;
  if (profile.source === "live" || profile.source === "user") return false;
  return (profile.topVideos || []).some(
    (video) =>
      Boolean(video.audioUrl?.includes("example.com")) &&
      /^v\d+$/.test(video.id || ""),
  );
}

export function assertNotLiveOnMock(profile: {
  source?: string | null;
  topVideos?: Array<{ id?: string; audioUrl?: string | null }>;
}) {
  if (isMockScrapedProfile(profile) && envHasAi() && !allowMockProfile()) {
    throw new HonestyError(LIVE_ON_MOCK_MESSAGE, "LIVE_ON_MOCK", 503);
  }
}
