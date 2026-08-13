import { sliceChars } from "@/lib/ai/safe-json";
import { normalizeKeyword } from "@/lib/comment-keyword";
import type {
  FunnelKit,
  GeneratedScript,
  PlatformPack,
  StrategyPayload,
} from "@/lib/types";
import { isDuplicateTitle, rankHooks } from "@/lib/ai/score-hooks";

const DURATIONS = [15, 30, 45] as const;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, min = 0, fallback: string[] = []): string[] {
  const arr = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  if (arr.length >= min) return arr;
  return [...arr, ...fallback].slice(0, Math.max(min, fallback.length));
}

function defaultPacks(keyword: string, title: string): PlatformPack {
  return {
    reels: {
      caption: `${title}. Комментируй «${keyword}» — пришлю гайд.`,
      cta: `Комментируй «${keyword}»`,
      hashtags: ["#reels", "#контент"],
    },
    vk_clips: {
      caption: `${title}. Напиши «${keyword}» в комментариях.`,
      cta: `Напиши «${keyword}»`,
    },
    shorts: {
      title: sliceChars(title, 70),
      description: `Короткий разбор. Комментарий «${keyword}».`,
      cta: `Комментарий «${keyword}»`,
    },
    telegram_post: {
      text: `${title}\n\nКороткий разбор для канала. Напиши боту «${keyword}», если нужен гайд.`,
      cta: `Напиши боту: ${keyword}`,
    },
  };
}

function normalizeFunnel(
  funnel: Partial<FunnelKit> | undefined,
  keyword: string,
  lead: string,
): FunnelKit {
  return {
    comment_keyword: normalizeKeyword(funnel?.comment_keyword, keyword),
    bot_reply:
      asString(funnel?.bot_reply) ||
      `Лови ${lead}. Сохрани сообщение, чтобы не потерять.`,
    lead_magnet: asString(funnel?.lead_magnet, lead),
    telegram_cta:
      asString(funnel?.telegram_cta) ||
      `Напиши боту слово ${keyword}`,
  };
}

function normalizePlatformPacks(
  packs: PlatformPack | undefined,
  keyword: string,
  title: string,
): PlatformPack {
  const fallback = defaultPacks(keyword, title);
  if (!packs) return fallback;
  return {
    reels: {
      caption: asString(packs.reels?.caption, fallback.reels.caption),
      cta: asString(packs.reels?.cta, fallback.reels.cta),
      hashtags: asStringArray(packs.reels?.hashtags, 0, fallback.reels.hashtags),
    },
    vk_clips: {
      caption: asString(packs.vk_clips?.caption, fallback.vk_clips.caption),
      cta: asString(packs.vk_clips?.cta, fallback.vk_clips.cta),
    },
    shorts: {
      title: asString(packs.shorts?.title, fallback.shorts.title),
      description: asString(
        packs.shorts?.description,
        fallback.shorts.description,
      ),
      cta: asString(packs.shorts?.cta, fallback.shorts.cta),
    },
    telegram_post: {
      text: asString(
        packs.telegram_post?.text,
        fallback.telegram_post.text,
      ),
      cta: asString(packs.telegram_post?.cta, fallback.telegram_post.cta),
    },
  };
}

function ensureTeleprompter(raw: string, duration: number, keyword: string) {
  const text = asString(raw);
  const lastLine = text.trim().split("\n").pop() || "";
  const tooShort = Array.from(text).length < 48;
  const cutOff =
    /[а-яёa-z]$/i.test(text.trim()) || /^[\d:.\s–—-]+$/.test(lastLine.trim());
  const hasClock = /0\s*[–—-]\s*3/.test(text) || /\[0/.test(text);
  if (hasClock && !tooShort && !cutOff) {
    if (/смотрите в камеру/i.test(text) && /ошибка аудитории/i.test(text)) {
      return processFallback(duration, keyword);
    }
    return text;
  }
  if (!tooShort && !cutOff && Array.from(text).length >= 80) return text;
  return processFallback(duration, keyword);
}

function processFallback(duration: number, keyword: string) {
  const mid = Math.max(8, Math.round(duration * 0.55));
  const preCta = Math.max(12, duration - 4);
  return [
    `0–3с: Крупный план продукта. Текст на экране — хук без приветствия.`,
    `3–${mid}с: Процесс или ошибка крупно, без речи в камеру.`,
    `${mid}–${preCta}с: Результат — текстура, разлом, готовый кадр.`,
    `${preCta}–${duration}с: Надпись: напиши «${keyword}» в комментарии.`,
  ].join("\n");
}

function normalizeScript(
  script: GeneratedScript,
  index: number,
  sharedKeyword: string,
): GeneratedScript {
  const duration = DURATIONS[index] || script.duration_sec || 30;
  const keyword = sharedKeyword;

  const hooks = asStringArray(script.hook_options, 0, []).slice(0, 3);
  const ranked = rankHooks(
    hooks.length >= 3
      ? hooks
      : [
          ...hooks,
          script.source_angle || script.title,
          `Один кадр — и видно, получилось ли`,
        ].filter(Boolean).slice(0, 3),
  ).map((h) => sliceChars(h, 90));

  const title = asString(script.title, `Сценарий ${duration} сек`);
  const funnel = normalizeFunnel(script.funnel, keyword, "бесплатный гайд");
  const packs = normalizePlatformPacks(script.platform_packs, keyword, title);
  const shotList = asStringArray(script.shot_list, 0, []).slice(0, 8);

  return {
    ...script,
    title,
    format: asString(script.format, `Reels ${duration}с`),
    duration_sec: duration,
    shoot_order: script.shoot_order || index + 1,
    comment_keyword: keyword,
    hook_options: ranked,
    teleprompter_script: ensureTeleprompter(
      script.teleprompter_script,
      duration,
      keyword,
    ),
    caption: asString(script.caption, packs.reels.caption),
    cta: asString(script.cta, packs.reels.cta),
    props_checklist: asStringArray(script.props_checklist, 0, ["штатив"]),
    platform_packs: packs,
    funnel,
    source_angle: asString(script.source_angle),
    shot_list: shotList,
  };
}

/**
 * Post-process LLM strategy: fix lengths, shared keyword, packs, teleprompter skeleton.
 * Improves reliability without a second expensive LLM call.
 */
export function normalizeStrategy(
  raw: StrategyPayload,
  previousTitles: string[] = [],
  options: { sharedKeyword?: string } = {},
): StrategyPayload {
  const sharedKeyword = normalizeKeyword(
    options.sharedKeyword ||
      raw.funnel_kit?.comment_keyword ||
      raw.scripts?.[0]?.comment_keyword,
    "ГАЙД",
  ).replace(/\d+$/, "") || "ГАЙД";

  const scripts = (raw.scripts || [])
    .slice(0, 3)
    .map((s, i) => {
      const normalized = normalizeScript(s, i, sharedKeyword);
      if (isDuplicateTitle(normalized.title, previousTitles)) {
        normalized.title = `${normalized.title} · новый угол`;
      }
      return normalized;
    });

  while (scripts.length < 3) {
    const i = scripts.length;
    scripts.push(
      normalizeScript(
        {
          title: `Сценарий ${DURATIONS[i]} сек`,
          format: `Reels ${DURATIONS[i]}с`,
          hook_options: [],
          teleprompter_script: "",
          caption: "",
          cta: "",
        },
        i,
        sharedKeyword,
      ),
    );
  }

  const funnelKit = normalizeFunnel(
    raw.funnel_kit,
    sharedKeyword,
    "бесплатный гайд",
  );

  const pillars = Array.isArray(raw.content_pillars)
    ? raw.content_pillars
        .filter((p) => p?.title)
        .slice(0, 6)
        .map((p) => ({
          title: asString(p.title),
          description: asString(p.description, p.title),
        }))
    : [];

  const tips = asStringArray(raw.profile_audit_tips, 3, [
    "Сделайте обещание в био явным.",
    "Закрепите ролик с лучшим удержанием.",
    "Добавьте ключевое слово-CTA в обучающие ролики.",
  ]).slice(0, 6);

  let calendar = Array.isArray(raw.pillars_calendar)
    ? raw.pillars_calendar.slice(0, 7)
    : [];
  if (calendar.length < 7 && pillars.length) {
    const roles = [
      "entertainment",
      "expert",
      "trust",
      "social_proof",
      "offer",
      "entertainment",
      "expert",
    ] as const;
    const platforms = [
      "reels",
      "shorts",
      "telegram",
      "vk",
      "reels",
      "vk",
      "shorts",
    ] as const;
    calendar = roles.map((role, i) => ({
      day: i + 1,
      pillar: pillars[i % pillars.length]?.title || "Контент",
      role,
      topic: pillars[i % pillars.length]?.description || "Тема дня",
      platform_focus: platforms[i],
    }));
  }

  const shoot = raw.shoot_day || {
    title: "Съёмочный день · 1 образ",
    duration_min: 90,
    outfit: "Один нейтральный верх",
    location: "Один спокойный фон",
    props: ["штатив", "лист с хуками"],
    order: scripts.map((s, i) => ({
      shoot_order: i + 1,
      script_title: s.title,
      duration_sec: s.duration_sec || DURATIONS[i],
      note: i === 0 ? "Снимай первым — разогрев" : "Тот же образ",
    })),
    extra_ideas: [],
  };

  return {
    niche: asString(raw.niche, "Короткий контент"),
    target_audience: asString(
      raw.target_audience,
      "Авторы и эксперты СНГ",
    ),
    content_pillars: pillars.length
      ? pillars
      : [
          {
            title: "Хуки",
            description: "Остановка скролла за 1–3 секунды",
          },
        ],
    profile_audit_tips: tips,
    scripts,
    funnel_kit: funnelKit,
    pillars_calendar: calendar,
    shoot_day: {
      title: asString(shoot.title, "Съёмочный день"),
      duration_min: Number(shoot.duration_min) || 90,
      outfit: asString(shoot.outfit, "Один образ"),
      location: asString(shoot.location, "Один фон"),
      props: asStringArray(shoot.props, 1, ["штатив"]),
      order: Array.isArray(shoot.order) ? shoot.order : [],
      extra_ideas: Array.isArray(shoot.extra_ideas)
        ? shoot.extra_ideas.slice(0, 6)
        : [],
    },
    autopsy_template: raw.autopsy_template || {
      weak_hook_fix: "Слабый хук без конфликта",
      retention_fix: "Польза слишком поздно",
      cta_fix: "CTA без ключевого слова",
      reshoot_hook: "Остановитесь, если ролик умирает на 3-й секунде",
    },
  };
}
