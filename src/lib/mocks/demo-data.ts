import type {
  AutopsyPayload,
  PlatformPack,
  ScrapedProfile,
  StrategyPayload,
  ViralRemakePayload,
} from "@/lib/types";

function demoPlatformPacks(keyword: string, offer: string): PlatformPack {
  return {
    reels: {
      caption: `Сохрани, чтобы не потерять. Комментируй «${keyword}» — пришлю ${offer}.`,
      cta: `Комментируй «${keyword}»`,
      hashtags: ["#reels", "#контент", "#хуки"],
    },
    vk_clips: {
      caption: `Коротко и по делу. Напиши «${keyword}» в комментариях — отправлю ${offer} в сообщения.`,
      cta: `Напиши «${keyword}» в комментариях`,
    },
    shorts: {
      title: `Ошибка, из‑за которой падает удержание`,
      description: `Разбор приёма + мягкий CTA. Ключевое слово «${keyword}» в комментариях.`,
      cta: `Комментарий «${keyword}»`,
    },
    telegram_post: {
      text: `Короткий разбор для канала:\n\n1) Хук в первые 3 секунды\n2) Одна конкретная ошибка\n3) Приём, который можно применить сегодня\n\nХочешь ${offer} — напиши «${keyword}» боту.`,
      cta: `Напиши боту: ${keyword}`,
    },
  };
}

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
    source: "mock",
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
  nichePreset?: string | null;
  voiceDraft?: string | null;
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

  const packs = demoPlatformPacks("ХУК", offer);
  const funnel = {
    comment_keyword: "ХУК",
    bot_reply: `Лови ${offer}. Вот ссылка и короткий гайд — сохрани, чтобы не потерять.`,
    lead_magnet: offer,
    telegram_cta: "Напиши боту слово ХУК",
  };

  return {
    niche: input.nichePreset
      ? `Ниша пресета «${input.nichePreset}» + короткий контент`
      : "Короткий контент: рост и обучение авторов",
    target_audience:
      "Авторы, SMM-менеджеры и эксперты СНГ, которым нужны стабильные Reels / VK Клипы",
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
        description: `Клипы, которые ведут к комментариям и Telegram за ${offer}`,
      },
    ],
    profile_audit_tips: [
      `Сделайте обещание в био @${input.handle} явным: что подписчик получит на этой неделе.`,
      "Закрепите ролик с лучшим удержанием и переснимите его с более сильным первым кадром.",
      `Выровняйте сетку под цель (${goalLabel}) и ${toneLabel} тоном.`,
      "Добавляйте ключевое слово-CTA и дублируйте оффер в Telegram.",
      ...(input.voiceDraft
        ? [`Учтите идею из голосового черновика: «${input.voiceDraft.slice(0, 80)}…»`]
        : []),
    ],
    funnel_kit: funnel,
    autopsy_template: {
      weak_hook_fix: "Первые 3 секунды без конфликта или цифры",
      retention_fix: "Слишком долго до конкретной пользы",
      cta_fix: "CTA размытый или в середине ролика",
      reshoot_hook: "Хватит винить алгоритм — проблема в первой фразе",
    },
    pillars_calendar: [
      {
        day: 1,
        pillar: "Хуки",
        role: "entertainment",
        topic: "Ошибка в первых 3 секундах",
        platform_focus: "reels",
      },
      {
        day: 2,
        pillar: "Доказательства",
        role: "expert",
        topic: "Один фреймворк на пальцах",
        platform_focus: "shorts",
      },
      {
        day: 3,
        pillar: "Доверие",
        role: "trust",
        topic: "Закулисье / процесс",
        platform_focus: "telegram",
      },
      {
        day: 4,
        pillar: "Соцдок",
        role: "social_proof",
        topic: "Кейс ученика / клиента",
        platform_focus: "vk",
      },
      {
        day: 5,
        pillar: "Оффер",
        role: "offer",
        topic: `Мягкий CTA за ${offer}`,
        platform_focus: "reels",
      },
      {
        day: 6,
        pillar: "Хуки",
        role: "entertainment",
        topic: "Миф vs факт",
        platform_focus: "vk",
      },
      {
        day: 7,
        pillar: "Система",
        role: "expert",
        topic: "Контент на неделю одним шаблоном",
        platform_focus: "shorts",
      },
    ],
    shoot_day: {
      title: "Съёмочный день · 1 образ",
      duration_min: 90,
      outfit: "Один нейтральный верх, без логотипов конкурентов",
      location: "Один фон у окна / стены",
      props: ["телефон на штативе", "лист с хуками", "оффер на экране"],
      order: [
        {
          shoot_order: 1,
          script_title: "Почему хуки умирают за 3 секунды",
          duration_sec: 15,
          note: "Снимай первым — разогрев, энергия выше",
        },
        {
          shoot_order: 2,
          script_title: "Вирусный сценарий из 3 блоков",
          duration_sec: 30,
          note: "Нужен экран/лист с блоками",
        },
        {
          shoot_order: 3,
          script_title: "Мягкие продажи без «продажности»",
          duration_sec: 45,
          note: "В конце покажи оффер спокойно",
        },
      ],
      extra_ideas: [
        {
          title: "До/после одного приёма",
          hook: "Я поменял одну фразу — и удержание выросло",
          pillar: "Доказательства",
          duration_sec: 20,
        },
        {
          title: "Чеклист из 5 пунктов на экране",
          hook: "Сохрани, если снимаешь без сценария",
          pillar: "Система",
          duration_sec: 25,
        },
        {
          title: "Разбор чужого вируса под себя",
          hook: "Укради структуру, не копируй текст",
          pillar: "Хуки",
          duration_sec: 30,
        },
        {
          title: "Ответ на частый вопрос в Директ",
          hook: "Меня спрашивают одно и то же — отвечаю вслух",
          pillar: "Доверие",
          duration_sec: 20,
        },
      ],
    },
    scripts: [
      {
        title: "Почему хуки умирают за 3 секунды",
        format: "Reels 15с · ошибка",
        duration_sec: 15,
        shoot_order: 1,
        comment_keyword: "ХУК",
        props_checklist: ["лист с 3 хуками", "штатив"],
        hook_options: [
          "Хватит винить алгоритм — проблема в первой фразе.",
          "Если уходят сразу, проверьте эту одну привычку.",
          "Ваш рилс умирает ещё до пользы — вот почему.",
        ],
        teleprompter_script:
          "0–3с: Хук — смотрите в камеру, произнесите сильное открытие.\n3–10с: Покажите 2 плохих и 1 хороший хук на экране.\n10–15с: CTA — комментируйте ХУК за бесплатный чеклист.",
        caption: packs.reels.caption,
        cta: packs.reels.cta,
        platform_packs: packs,
        funnel,
      },
      {
        title: "Вирусный сценарий из 3 блоков",
        format: "Reels 30с · шаблон",
        duration_sec: 30,
        shoot_order: 2,
        comment_keyword: "СКРИПТ",
        props_checklist: ["маркер", "3 карточки блоков"],
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
        platform_packs: demoPlatformPacks("СКРИПТ", offer),
        funnel: {
          ...funnel,
          comment_keyword: "СКРИПТ",
          telegram_cta: "Напиши боту слово СКРИПТ",
        },
      },
      {
        title: "Мягкие продажи без «продажности»",
        format: "Reels 45с · оффер",
        duration_sec: 45,
        shoot_order: 3,
        comment_keyword: "ГАЙД",
        props_checklist: ["карточка оффера"],
        hook_options: [
          "Жёсткие CTA убивают охват. Попробуйте мягкое закрытие.",
          "Я перестал говорить «ссылка в био» — и комментарии выросли вдвое.",
          "Мягкий финал даёт больше сохранений, чем «купи сейчас».",
        ],
        teleprompter_script: `0–3с: Хук про мягкие CTA.\n3–20с: Дайте 2 полезных приёма без продажи.\n20–35с: Покажите, как встроить оффер естественно.\n35–45с: CTA — ключевое слово в комментариях за ${offer}.`,
        caption: `Сначала польза, потом продажа. Комментируйте, чтобы получить ${offer}.`,
        cta: "Комментируйте «ГАЙД»",
        platform_packs: demoPlatformPacks("ГАЙД", offer),
        funnel: {
          ...funnel,
          comment_keyword: "ГАЙД",
          telegram_cta: "Напиши боту слово ГАЙД",
        },
      },
    ],
  };
}

export function mockViralRemake(input: {
  sourceUrl: string;
  offerSummary?: string | null;
}): ViralRemakePayload {
  const offer = input.offerSummary?.trim() || "бесплатный чеклист";
  const packs = demoPlatformPacks("РЕМЕЙК", offer);
  const funnel = {
    comment_keyword: "РЕМЕЙК",
    bot_reply: `Вот адаптация вируса под твой оффер + ${offer}.`,
    lead_magnet: offer,
    telegram_cta: "Напиши боту: РЕМЕЙК",
  };
  return {
    source_url: input.sourceUrl,
    source_structure: {
      hook: "Конфликт / ошибка в первые 3 секунды",
      conflict: "Зритель узнаёт себя в проблеме",
      demo: "Один конкретный приём на экране",
      cta: "Ключевое слово в комментариях",
    },
    remake: {
      title: "Пересъём вируса под ваш оффер",
      format: "Reels 30с · remake",
      duration_sec: 30,
      comment_keyword: "РЕМЕЙК",
      hook_options: [
        "Укради структуру этого ролика — не текст.",
        "Тот же каркас, но про твою нишу.",
        "Вирусный паттерн за 30 секунд под твой оффер.",
      ],
      teleprompter_script:
        "0–3с: Хук с вашей болью аудитории.\n3–18с: Конфликт → ваш приём / демо.\n18–30с: Мягкий CTA со словом РЕМЕЙК.",
      caption: packs.reels.caption,
      cta: packs.reels.cta,
      platform_packs: packs,
      funnel,
      props_checklist: ["референс на втором экране", "ваш проп из ниши"],
    },
    platform_packs: packs,
    funnel,
  };
}

export function mockAutopsy(input: {
  sourceUrl: string;
  offerSummary?: string | null;
}): AutopsyPayload {
  const offer = input.offerSummary?.trim() || "чеклист пересъёма";
  return {
    source_url: input.sourceUrl,
    score: 62,
    findings: {
      weak_hook_fix: "Хук без конкретики и конфликта",
      retention_fix: "Польза начинается слишком поздно",
      cta_fix: "CTA размытый, без ключевого слова",
      reshoot_hook: "Остановитесь, если ролик умирает на 3-й секунде",
    },
    rewritten_hooks: [
      "Остановитесь, если ролик умирает на 3-й секунде",
      "Одна ошибка убивает удержание — проверьте её",
      "Не алгоритм виноват. Виновата первая фраза.",
    ],
    reshoot_script: {
      title: "Пересъём после разбора",
      format: "Reels 20с · autopsy",
      duration_sec: 20,
      comment_keyword: "РАЗБОР",
      hook_options: [
        "Остановитесь, если ролик умирает на 3-й секунде",
        "Одна ошибка убивает удержание — проверьте её",
        "Не алгоритм виноват. Виновата первая фраза.",
      ],
      teleprompter_script: `0–3с: Новый хук.\n3–14с: Исправьте слабое место наглядно.\n14–20с: CTA — «РАЗБОР» за ${offer}.`,
      caption: `Пересняли слабый ролик сильнее. Комментируй РАЗБОР — пришлю ${offer}.`,
      cta: "Комментируй «РАЗБОР»",
    },
  };
}
