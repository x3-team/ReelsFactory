import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

export function mockScrapedProfile(
  handle: string,
  platform: ScrapedProfile["platform"],
): ScrapedProfile {
  const clean = handle.replace(/^@/, "");
  return {
    handle: clean,
    platform,
    displayName: clean
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" "),
    bio: `Помогаю авторам расти через практичные советы для ${platform}. Гайд — в шапке профиля 🔗`,
    followers: 48200,
    following: 312,
    postsCount: 186,
    topVideos: [
      {
        id: "v1",
        url: `https://${platform}.com/${clean}/video/1`,
        caption: "Одна ошибка, из‑за которой падает удержание",
        views: 920_000,
        likes: 61_000,
        audioUrl: "https://example.com/audio/1.mp3",
        durationSec: 18,
      },
      {
        id: "v2",
        url: `https://${platform}.com/${clean}/video/2`,
        caption: "3 хука, которые всегда останавливают скролл",
        views: 710_000,
        likes: 44_000,
        audioUrl: "https://example.com/audio/2.mp3",
        durationSec: 22,
      },
      {
        id: "v3",
        url: `https://${platform}.com/${clean}/video/3`,
        caption: "Моя система контента на неделю",
        views: 530_000,
        likes: 29_000,
        audioUrl: "https://example.com/audio/3.mp3",
        durationSec: 27,
      },
      {
        id: "v4",
        url: `https://${platform}.com/${clean}/video/4`,
        caption: "За кадром вирусного рилса",
        views: 410_000,
        likes: 21_000,
        audioUrl: "https://example.com/audio/4.mp3",
        durationSec: 15,
      },
      {
        id: "v5",
        url: `https://${platform}.com/${clean}/video/5`,
        caption: "Формулы CTA, которые собирают комментарии",
        views: 365_000,
        likes: 18_500,
        audioUrl: "https://example.com/audio/5.mp3",
        durationSec: 19,
      },
    ],
  };
}

export function mockTranscription(videoCaption?: string) {
  return [
    "Хук: остановитесь, если ваши рилсы умирают после трёх секунд.",
    videoCaption ? `Тема: ${videoCaption}.` : "Тема: рост контента.",
    "Дальше показываю рабочий паттерн: перехват внимания, доказательство и чёткий CTA.",
    "Люди комментируют ключевое слово, чтобы получить бесплатный чеклист.",
  ].join(" ");
}

export function mockStrategy(input: {
  handle: string;
  goal: string;
  tone: string;
  offerSummary?: string | null;
}): StrategyPayload {
  const offer = input.offerSummary?.trim() || "бесплатный чеклист по контенту";
  const goalLabel =
    input.goal === "SELL_PRODUCT"
      ? "продажи продукта/услуги"
      : "роста аудитории";
  const toneLabel =
    (
      {
        DIRECT: "прямым",
        HUMOROUS: "юмористичным",
        EXPERT: "экспертным",
        STORYTELLING: "сторителлинговым",
      } as Record<string, string>
    )[input.tone] || "прямым";

  return {
    niche: "Короткий контент: рост и обучение авторов",
    target_audience:
      "Авторы, SMM-менеджеры и эксперты, которым нужны стабильные Reels",
    content_pillars: [
      {
        title: "Хуки, которые останавливают скролл",
        description: "Открытия, которые цепляют за 1–3 секунды",
      },
      {
        title: "Доказательства и системы",
        description: "Фреймворки, рутины и закулисье процесса",
      },
      {
        title: "Мягкие CTA под оффер",
        description: `Клипы, которые ведут к комментариям и сообщениям за ${offer}`,
      },
    ],
    profile_audit_tips: [
      `Сделайте обещание в био @${input.handle} явным: что подписчик получит на этой неделе.`,
      "Закрепите ролик с лучшим удержанием и переснимите его с более сильным первым кадром.",
      `Выровняйте сетку под цель (${goalLabel}) и ${toneLabel} тоном.`,
      "Добавляйте ключевое слово-CTA в подпись каждого обучающего рилса.",
    ],
    scripts: [
      {
        title: "Почему хуки умирают за 3 секунды",
        format: "Reels / Shorts (15 сек)",
        duration_sec: 15,
        hook_options: [
          "Хватит винить алгоритм — проблема в первой фразе.",
          "Если уходят сразу, проверьте эту одну привычку.",
          "Ваш рилс умирает ещё до пользы — вот почему.",
        ],
        teleprompter_script:
          "0–3с: Хук — смотрите в камеру, произнесите сильное открытие.\n3–10с: Покажите 2 плохих и 1 хороший хук на экране.\n10–15с: CTA — комментируйте ХУК за бесплатный чеклист.",
        caption:
          "Большинство авторов теряет зрителей до начала пользы. Заберите формулу хука. Комментируйте ХУК — пришлю чеклист.",
        cta: "Комментируйте «ХУК»",
      },
      {
        title: "Вирусный сценарий из 3 блоков",
        format: "Reels / Shorts (30 сек)",
        duration_sec: 30,
        hook_options: [
          "Я собираю 12 рилсов по одному шаблону — вот он.",
          "Этот сценарий из 3 блоков стабильно даёт сохранения.",
          "Один каркас — и контент на неделю без ступора.",
        ],
        teleprompter_script:
          "0–3с: Хук с обещанием шаблона.\n3–20с: Разберите блоки Хук → Доказательство → CTA с подписями на экране.\n20–30с: Покажите оффер и попросите ключевое слово в комментариях.",
        caption:
          "Сохраните шаблон до съёмки завтра. Ключевое слово в комментариях откроет полный чеклист.",
        cta: "Комментируйте «СКРИПТ»",
      },
      {
        title: "Мягкие продажи без «продажности»",
        format: "Reels / Shorts (45 сек)",
        duration_sec: 45,
        hook_options: [
          "Жёсткие CTA убивают охват. Попробуйте мягкое закрытие.",
          "Я перестал говорить «ссылка в био» — и комментарии выросли вдвое.",
          "Мягкий финал даёт больше сохранений, чем «купи сейчас».",
        ],
        teleprompter_script:
          `0–3с: Хук про мягкие CTA.\n3–20с: Дайте 2 полезных приёма без продажи.\n20–35с: Покажите, как встроить оффер естественно.\n35–45с: CTA — ключевое слово в комментариях за ${offer}.`,
        caption: `Сначала польза, потом продажа. Комментируйте, чтобы получить ${offer}.`,
        cta: "Комментируйте «ГАЙД»",
      },
    ],
  };
}
