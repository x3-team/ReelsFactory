/**
 * Honesty policy: never let a live model write confident copy about a
 * fabricated profile. Live LLM + mock scrape is the most misleading failure.
 */

import { lookupCorpus } from "./test-corpus.ts";

export type ProfileSource = "live" | "mock" | "user";

export type AnalyzeIntent = {
  hasUserReels?: boolean;
  handle?: string | null;
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

export const USER_REELS_WEAK_MESSAGE =
  "К ссылкам напишите, о чём ролик, или цифру из Insights (просмотры / удержание). Иначе не из чего собрать сценарий — и мы не будем притворяться, что открыли аккаунт.";

export const YOUTUBE_UNSUPPORTED_MESSAGE =
  "YouTube-канал не разбираем. Вставьте 3–5 URL Shorts или видео с подписью — разберём только их, не канал и не длинную аналитику.";

export const TIKTOK_NEEDS_APIFY_MESSAGE =
  "TikTok нужен APIFY_TOKEN. RapidAPI умеет только Instagram.";

export const SCRAPE_FAILED_MESSAGE =
  "Не удалось разобрать этот аккаунт. Проверьте, что профиль открытый и в нём есть Reels.";

export const APIFY_HARD_LIMIT_MESSAGE =
  "Apify: месячный hard limit. Новый скрейп не запускаем. Свежий датасет этого аккаунта берём, если он есть — иначе отказ, не мок.";

export const LIVE_ON_MOCK_MESSAGE =
  "Демо-профиль нельзя разбирать живой моделью — получится уверенный текст про выдуманный аккаунт.";

export const CORPUS_NO_LIVE_MESSAGE =
  "Этот публичный аккаунт из тестового корпуса нельзя разбирать демо-профилем. Без ключа скрейпа (APIFY_TOKEN или RAPIDAPI_KEY) живого разбора нет — не подставляем «стратегию огонь».";

export const CORPUS_PLATFORM_UNKNOWN_MESSAGE =
  "Для этого хендла площадка не подтверждена. Не угадываем Instagram. Вставьте URL профиля или 3–5 ссылок на свои ролики.";

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
        : "Скрейп живой, AI нет — сценарии из подписей роликов, без демо-хуков и без выдуманной речи.",
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
  const hit = lookupCorpus(intent.handle);
  const p = (hit?.platform || platform || "").toLowerCase();

  if (hit && !hit.platform && !intent.hasUserReels) {
    throw new HonestyError(
      CORPUS_PLATFORM_UNKNOWN_MESSAGE,
      "CORPUS_PLATFORM_UNKNOWN",
      400,
    );
  }

  // YouTube is never scraped. Mocking it as a Reels "lifestyle" audit is a lie
  // for channels like @kolodets / @investfutureru.
  if (p === "youtube" && !intent.hasUserReels) {
    throw new HonestyError(YOUTUBE_UNSUPPORTED_MESSAGE, "YOUTUBE", 400);
  }

  if (hit && !canScrapePlatform(p, env) && !intent.hasUserReels) {
    throw new HonestyError(CORPUS_NO_LIVE_MESSAGE, "CORPUS_NO_LIVE", 503);
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

/**
 * Live scrape without an AI key must not fall back to the 48k-hook demo.
 * Scripts come from captions (local-shell). Mock strategy is only for a
 * mock / explicit demo profile.
 */
export type StrategyBackend = "mock" | "local-shell" | "llm";

export function resolveStrategyBackend(
  profile: {
    source?: string | null;
    topVideos?: Array<{ id?: string; audioUrl?: string | null }>;
  },
  env: HonestyEnv = process.env,
): StrategyBackend {
  if (isMockScrapedProfile(profile)) return "mock";
  if (envForcesAllMock(env) || !envHasAi(env)) return "local-shell";
  return "llm";
}

export function assertNotLiveOnMock(profile: {
  source?: string | null;
  topVideos?: Array<{ id?: string; audioUrl?: string | null }>;
}) {
  if (isMockScrapedProfile(profile) && envHasAi() && !allowMockProfile()) {
    throw new HonestyError(LIVE_ON_MOCK_MESSAGE, "LIVE_ON_MOCK", 503);
  }
}
