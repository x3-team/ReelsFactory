import { DARIA_BIO, DARIA_CAPTIONS } from "@/lib/ai/fixtures/cis-corpus-live";
import type { GeneratedScript, ScrapedProfile, StrategyPayload } from "@/lib/types";
import {
  captionSourceStrength,
  extractAnchorPhrases,
  scriptHasSourceAnchor,
} from "@/lib/ai/source-anchors";

export function mockScrapedProfile(
  handle: string,
  platform: ScrapedProfile["platform"],
): ScrapedProfile {
  const clean = handle.replace(/^@/, "");
  if (/agre_daria_fit/i.test(clean)) {
    return {
      handle: clean,
      platform,
      displayName: "Agre Daria Fit",
      bio: DARIA_BIO,
      followers: 12000,
      topVideos: DARIA_CAPTIONS.map((caption, index) => ({
        id: `daria-${index}`,
        url: `https://${platform}.com/${clean}/video/${index}`,
        caption,
        views: 8000 - index * 200,
        audioUrl: `https://example.com/audio/daria-${index}.mp3`,
        durationSec: 15,
      })),
    };
  }
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
    "Стоп, если ролик умирает после трёх секунд.",
    videoCaption ? `Тема: ${videoCaption}.` : "Тема: как говорить в кадре.",
    "Дальше один приём: удар в первой фразе, потом доказательство, потом мягкий финал.",
    "Люди пишут слово в комментарии, если ты просишь об этом спокойно.",
  ].join(" ");
}

const OFFICE_BANNED =
  /контент-машин|viral hooks|мы №1|масштабировать личный бренд/i;

function dessertScripts(offer: string): GeneratedScript[] {
  return [
    {
      title: "Зефир плывёт не из‑за агара",
      format: "Reels 15с · ошибка",
      duration_sec: 15,
      hook_options: [
        "Зефир плывёт? Агар тут ни при чём.",
        "Если не держит форму — смотри температуру.",
        "Одна цифра на термометре решает всё.",
      ],
      teleprompter_script:
        "0–3с: Стоп. Зефир плывёт не потому что агар плохой.\n3–8с: Проблема в сиропе: ниже ста десяти — масса не соберётся, хоть три пачки засыпь.\n8–12с: Демо: термометр в кадр. Сто десять. Держи. Потом взбивай.\n12–15с: Сохрани. Завтра снимешь без кома в миске.",
      caption:
        "Не вини агар. Сначала температура сиропа. Сохрани, чтобы не искать завтра.",
      cta: "Сохрани ролик",
    },
    {
      title: "Как я взбиваю, чтобы не было комков",
      format: "Reels 30с · процесс",
      duration_sec: 30,
      hook_options: [
        "Комки в зефире — это не «руки кривые».",
        "Смотри, на какой секунде я останавливаю миксер.",
        "Три шага. Без магии и без «по вкусу».",
      ],
      teleprompter_script:
        "0–3с: Комки появляются не в конце. Они уже в сиропе.\n3–16с: Проблема: льёшь горячее в белок слишком быстро — белок сварится клочками.\n16–24с: Демо: тонкая струя, миксер не глушу, жду ленту. Вот она тянется — стоп.\n24–30с: Напиши «ЛЕНТА» — пришлю короткий чеклист по температуре.",
      caption: "Струя, лента, стоп. Без «по вкусу». Коммент ЛЕНТА — чеклист.",
      cta: "Напиши «ЛЕНТА»",
    },
    {
      title: "Миф: домашний зефир всегда слаще покупного",
      format: "Reels 45с · миф",
      duration_sec: 45,
      hook_options: [
        "Домашний зефир не обязан быть приторным.",
        "Сладко до тошноты — это не «так надо».",
        "Я убрала ложку сахара. Смотри, что стало с формой.",
      ],
      teleprompter_script: `0–3с: Миф: домашний зефир обязан быть приторным.\n3–22с: Проблема в том, что сахар держат «для формы», а потом удивляются, что никто не доедает.\n22–38с: Демо: убери одну ложку, добавь кислоту, проверь срез через сутки. Держит? Держит.\n38–45с: Если нужен ${offer} — слово «СРЕЗ» в комментарии. Цену в каждый ролик не тащу.`,
      caption: `Сладко ≠ крепко. Слово СРЕЗ — ${offer}.`,
      cta: "Напиши «СРЕЗ»",
    },
  ];
}

function mathScripts(offer: string): GeneratedScript[] {
  return [
    {
      title: "Почему задача «не сходится» на первом шаге",
      format: "Reels 15с · ошибка",
      duration_sec: 15,
      hook_options: [
        "Ты не тупой. Ты пропускаешь единицу измерения.",
        "Задача ломается в первой строке, не в ответе.",
        "Стоп. Посмотри, что ты сократил.",
      ],
      teleprompter_script:
        "0–3с: Стоп. Задача не сходится не потому что ты «не математик».\n3–8с: Проблема: в первой строке уже потеряна единица — дальше любой ответ врёт.\n8–12с: Демо: подпиши см и минуты прямо над числами. Вот. Теперь считается.\n12–15с: Сохрани. Перед домашкой откроешь.",
      caption: "Сначала единицы, потом формула. Сохрани.",
      cta: "Сохрани ролик",
    },
    {
      title: "Как объяснить уравнение за 30 секунд",
      format: "Reels 30с · процесс",
      duration_sec: 30,
      hook_options: [
        "Не начинай с формулы. Начни с «что ищем».",
        "Одно неизвестное — одна стрелка на лист.",
        "Смотри, как я раскладываю уравнение вслух.",
      ],
      teleprompter_script:
        "0–3с: Не начинай с формулы. Скажи вслух, что ищем.\n3–16с: Проблема: ребёнок уже потерялся, пока ты пишешь иксы.\n16–24с: Демо: что известно, что найти, одна стрелка, потом перенос. Вслух.\n24–30с: Напиши «ИКС» — кину короткую шпаргалку.",
      caption: "Сначала «что ищем», потом икс. Коммент ИКС.",
      cta: "Напиши «ИКС»",
    },
    {
      title: "Миф: если не понял с первого раза — это не твоё",
      format: "Reels 45с · миф",
      duration_sec: 45,
      hook_options: [
        "Не понял с первого раза? Так и должно быть.",
        "Репетитор не маг. Он повторяет тем же языком.",
        "Одна ошибка в тетради важнее десяти галочек.",
      ],
      teleprompter_script: `0–3с: Миф: не понял с первого раза — значит, это не твоё.\n3–22с: Проблема в темпе: объяснили быстро, кивнул, дома пусто.\n22–38с: Демо: одну ошибку разбираем вслух два круга. Второй круг короче. Вот где кликает.\n38–45с: Если нужен ${offer} — слово «КРУГ» в комментарии.`,
      caption: `Второй круг короче первого. Коммент КРУГ — ${offer}.`,
      cta: "Напиши «КРУГ»",
    },
  ];
}

function spokenSnippet(text: string, max = 90) {
  const clean = (text || "")
    .replace(/[\u00a0\u1680\u2000-\u200d\u202f\u205f\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[тt]гк\s*:\s*\S+\s*/i, "")
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/@[\w.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > 40 ? cut.slice(0, space) : cut).trim();
}

function thinSourceScripts(offer: string, sourceTexts: string[]): GeneratedScript[] {
  const cleaned = [...new Set(
    (sourceTexts || [])
      .map((item) => spokenSnippet(item, 140))
      .filter((item) => item.length >= 12),
  )];
  const a = cleaned[0] || "В профиле мало текста";
  const b = cleaned[1] || cleaned[0] || a;
  const c = cleaned[2] || cleaned[0] || a;
  return [
    {
      title: spokenSnippet(a, 42) || a,
      format: "Reels 15с · ошибка",
      duration_sec: 15,
      hook_options: [spokenSnippet(a, 48), spokenSnippet(b, 48), "Скажи только то, что уже в профиле"],
      teleprompter_script: `0–3с: Стоп. ${spokenSnippet(a, 70)}.\n3–8с: ${spokenSnippet(b, 70)}.\n8–12с: Это уже в профиле — без чужой программы.\n12–15с: Сохрани.`,
      caption: `${spokenSnippet(a, 80)}. Сохрани.`,
      cta: "Сохрани ролик",
    },
    {
      title: spokenSnippet(b, 42) || b,
      format: "Reels 30с · процесс",
      duration_sec: 30,
      hook_options: [spokenSnippet(b, 48), spokenSnippet(a, 48), spokenSnippet(c, 48)],
      teleprompter_script: `0–3с: ${spokenSnippet(b, 70)}.\n3–16с: ${spokenSnippet(a, 90)}.\n16–24с: ${spokenSnippet(c, 70)}.\n24–30с: Сохрани.`,
      caption: `${spokenSnippet(b, 80)}.`,
      cta: "Сохрани ролик",
    },
    {
      title: spokenSnippet(c, 42) || c,
      format: "Reels 45с · миф",
      duration_sec: 45,
      hook_options: [spokenSnippet(c, 48), spokenSnippet(a, 48), spokenSnippet(b, 48)],
      teleprompter_script: `0–3с: ${spokenSnippet(c, 70)}.\n3–22с: ${spokenSnippet(a, 90)}.\n22–38с: ${spokenSnippet(b, 70)}. ${offer}.\n38–45с: Сохрани.`,
      caption: `${spokenSnippet(c, 80)}.`,
      cta: "Сохрани ролик",
    },
  ];
}

function genericScripts(handle: string, offer: string): GeneratedScript[] {
  return [
    {
      title: "Ролик умирает на первой фразе",
      format: "Reels 15с · ошибка",
      duration_sec: 15,
      hook_options: [
        "Хватит начинать с «привет, сегодня».",
        "Если уходят сразу — виновата первая фраза.",
        "Скажи удар. Потом уже пользу.",
      ],
      teleprompter_script:
        "0–3с: Хватит начинать с «привет, сегодня я расскажу».\n3–8с: Проблема: человек уже листнул, пока ты представляешься.\n8–12с: Демо: первая фраза — удар. Потом один факт. Без вступления.\n12–15с: Сохрани. Завтра снимешь с этой фразы.",
      caption: `Первая фраза без приветствия. Профиль @${handle}.`,
      cta: "Сохрани ролик",
    },
    {
      title: "Один приём на 30 секунд",
      format: "Reels 30с · процесс",
      duration_sec: 30,
      hook_options: [
        "Не три совета. Один. И пауза.",
        "Смотри, где я молчу — там и держат.",
        "Каркас простой: удар, ошибка, приём.",
      ],
      teleprompter_script:
        "0–3с: Не пихай три совета. Один. И пауза.\n3–16с: Проблема: рот не закрывается, зритель не успевает.\n16–24с: Демо: удар, одна ошибка, один приём. Пауза на секунду. Вот.\n24–30с: Напиши «ПАУЗА» — пришлю каркас на бумажке.",
      caption: "Один приём лучше трёх. Коммент ПАУЗА.",
      cta: "Напиши «ПАУЗА»",
    },
    {
      title: "Миф: в каждом ролике надо продавать",
      format: "Reels 45с · миф",
      duration_sec: 45,
      hook_options: [
        "Цена в каждом ролике убивает досмотр.",
        "Я перестала твердить «ссылка в шапке».",
        "Сначала польза. Продажа — в одном из трёх.",
      ],
      teleprompter_script: `0–3с: Миф: в каждом ролике надо впихнуть цену.\n3–22с: Проблема: человек слышит «купи» раньше пользы и закрывает.\n22–38с: Демо: два ролика — чистая польза. Третий — мягко про ${offer}. Без «мы лучшие».\n38–45с: Если заберёшь ${offer} — слово «ТИХО» в комментарии.`,
      caption: `Цену не копирую в каждый ролик. Коммент ТИХО — ${offer}.`,
      cta: "Напиши «ТИХО»",
    },
  ];
}

function plantSourceAnchors(
  scripts: GeneratedScript[],
  sourceTexts: string[],
): GeneratedScript[] {
  if (!sourceTexts.some((item) => item.trim())) return scripts;
  const phrases = extractAnchorPhrases(sourceTexts);
  return scripts.map((script, index) => {
    if (scriptHasSourceAnchor(script, sourceTexts).ok) return script;
    const anchor = phrases[index] || phrases[0];
    if (!anchor) return script;
    const lines = script.teleprompter_script.split("\n");
    if (lines[1]) {
      lines[1] = lines[1].replace(/^(\d+[–—-]\d+с:\s*)/, `$1${anchor}. `);
    } else if (lines[0]) {
      lines[0] = `${lines[0]} ${anchor}`;
    }
    return { ...script, teleprompter_script: lines.join("\n") };
  });
}

function captionDessertScripts(offer: string, blob: string): GeneratedScript[] {
  if (!/отсаж|кусочк|птичьего молока|маршмеллоу|пружин/i.test(blob)) {
    return dessertScripts(offer);
  }
  return [
    {
      title: "Почему зефир ломается кусочками",
      format: "Reels 15с · ошибка",
      duration_sec: 15,
      hook_options: [
        "Зефир ломается кусочками? Это хороший знак.",
        "После отсаживания он должен отламываться.",
        "Не тяни массу липкой лентой — смотри излом.",
      ],
      teleprompter_script:
        "0–3с: Зефир ломается кусочками? Не спеши считать это ошибкой.\n3–8с: После отсаживания масса должна отламываться, а не тянуться ниткой.\n8–12с: Если растекается — ещё не готова, форму не удержит.\n12–15с: Сохрани признак. Следующую партию проверишь так же.",
      caption: "После отсаживания зефир отламывается кусочками. Сохрани.",
      cta: "Сохрани ролик",
    },
    {
      title: "Сборка бенто из птичьего молока",
      format: "Reels 30с · процесс",
      duration_sec: 30,
      hook_options: [
        "Бенто из птичьего молока без сливочного масла.",
        "Клубника со сливками — слой тонкий, основа лёгкая.",
        "Не торопись со сборкой, пока слой не держит.",
      ],
      teleprompter_script:
        "0–3с: Этот бенто воздушный, потому что в рецепте нет сливочного масла.\n3–16с: Проблема: если торопиться со сборкой, клубничный слой поплывёт.\n16–24с: Демо: птичье молоко стабилизировалось — кладу клубнику со сливками тонко.\n24–30с: Напиши «БЕНТО» — разберу фисташку-малину или шоколад-ягоды.",
      caption: "Бенто из птичьего молока «Клубника со сливками», без сливочного масла.",
      cta: "Напиши «БЕНТО»",
    },
    {
      title: "Миф о маршмеллоу без белка",
      format: "Reels 45с · миф",
      duration_sec: 45,
      hook_options: [
        "Маршмеллоу без белка не будет пышным? Будет.",
        "Пружинки без белка — смотри, какие пышные.",
        "Двойной вкус, а белок я убрала.",
      ],
      teleprompter_script: `0–3с: Миф: без белка маршмеллоу получится плотным.\n3–22с: Проблема в голове, не в белке: эти пружинки как раз без белка и пышные.\n22–38с: Демо: двойной вкус, отсаживаю пружинки, рельеф держит.\n38–45с: Если нужен ${offer} — слово «ПРУЖИНА» в комментарии. Цену в каждый ролик не тащу.`,
      caption: "Маршмеллоу пружинки без белка. Коммент ПРУЖИНА.",
      cta: "Напиши «ПРУЖИНА»",
    },
  ];
}

export function mockStrategy(input: {
  handle: string;
  goal: string;
  tone: string;
  offerSummary?: string | null;
  bio?: string | null;
  captions?: string[] | null;
  extraFacts?: string[] | null;
  transcriptions?: string[] | null;
}): StrategyPayload {
  const offer = input.offerSummary?.trim() || "короткий чеклист";
  const handle = input.handle.replace(/^@/, "").toLowerCase();
  const extraFacts = (input.extraFacts || []).map((item) => item.trim()).filter(Boolean);
  const contentBlob = [
    input.bio || "",
    ...(input.captions || []),
    ...extraFacts,
    ...(input.transcriptions || []),
  ].join(" ");
  const blob = [handle, contentBlob].join(" ");

  const scripts = plantSourceAnchors(
    /зефир|zefir|бенто|торт|маршмеллоу|отсаж|кусок/i.test(contentBlob)
      ? captionDessertScripts(offer, contentBlob)
      : /eugenius|матем|уравнен|икс/i.test(blob)
        ? mathScripts(offer)
        : captionSourceStrength({
              bio: input.bio,
              captions: input.captions,
            }) !== "ok"
          ? thinSourceScripts(offer, [
              input.bio || "",
              ...(input.captions || []),
              ...extraFacts,
              ...(input.transcriptions || []),
            ])
          : genericScripts(handle, offer),
    [
      input.bio || "",
      ...(input.captions || []),
      ...extraFacts,
      ...(input.transcriptions || []),
    ],
  );

  for (const script of scripts) {
    if (OFFICE_BANNED.test(script.teleprompter_script)) {
      throw new Error("mock strategy must stay speakable");
    }
  }

  const goalLabel =
    input.goal === "SELL_PRODUCT" ? "продажи" : "чтобы досматривали";

  return {
    niche:
      /desert|зефир/i.test(blob)
        ? "Домашний зефир и десерты на заказ"
        : /eugenius|матем/i.test(blob)
          ? "Математика простым языком"
          : "Короткие ролики, которые читают с экрана",
    target_audience:
      /desert|зефир/i.test(blob)
        ? "Кто печёт дома и устал от плывущей массы"
        : /eugenius|матем/i.test(blob)
          ? "Школьники и родители, которым нужен спокойный разбор"
          : "Авторы, которым нужен текст в камеру, а не лозунг",
    content_pillars: [
      {
        title: "Ошибка в первой фразе",
        description: "Что ломается в первые три секунды",
      },
      {
        title: "Один приём",
        description: "Процесс без воды — можно повторить",
      },
      {
        title: "Мягкий финал",
        description: `CTA под цель: ${goalLabel}. Цену не в каждый ролик.`,
      },
    ],
    profile_audit_tips: [
      `В био @${handle} напиши, что человек получит на этой неделе — одной строкой.`,
      "Закрепи ролик, где первая фраза уже удар, без приветствия.",
      "Цену и оффер оставь максимум в одном сценарии из трёх.",
    ],
    scripts,
  };
}
