import { sanitizeForJson, sliceChars, sliceWords, stripLoneSurrogates } from "@/lib/ai/safe-json";
import { isUsableTranscript } from "@/lib/ai/speech-signal";
import { formatTeleprompter, humanizeKeyword, stripPrices } from "@/lib/ai/sanitize-scripts";
import { isSkeletonScript } from "@/lib/ai/repair-scripts";
import { assembleScriptsFromFacts, tidyCut } from "@/lib/ai/assemble-scripts";
import { parseVisionPayload } from "@/lib/ai/vision-frames";
import { alignAngles, constrainFacts, scrubInvented } from "@/lib/ai/constrain-facts";
import {
  buildFactCard,
  buildProfileInsights,
  hasProfileMedia,
  hasScriptSignal,
  hookLine,
  isBrokenNiche,
  isMostlyLatin,
  isNonRussianCopy,
  isOfftopicAngle,
  isPromoAngle,
  isTruncatedAngle,
  mergeVisualNotes,
  nicheFromInsights,
} from "@/lib/content/profile-insights";
import type { ScrapedProfile } from "@/lib/types";
import {
  hasEnoughSubmittedReels,
  parseSubmittedReels,
  parseViewsHint,
} from "@/lib/submitted-reels";
import {
  HonestyError,
  NO_SCRAPE_LIVE_MESSAGE,
  YOUTUBE_UNSUPPORTED_MESSAGE,
  allowMockProfile,
  assertCanAnalyzeProfile,
  isMockScrapedProfile,
  resolveHonesty,
} from "@/lib/honesty";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(!isUsableTranscript("Thank you for watching!"), "stock en");
assert(!isUsableTranscript("チャンネル登録をお願いいたします。"), "stock jp");
assert(!isUsableTranscript("200°C-392°F 10-15分"), "cjk recipe");
assert(!isUsableTranscript("ลูกนึกว่าถ่ายภาพนิ่ง สานสัมพันธ์พี่น้อง"), "thai speech");
assert(!isUsableTranscript("ok"), "too short");
assert(
  isUsableTranscript(
    "Смотрите, если зефир отламывается кусочками — значит сироп добит правильно.",
  ),
  "ru speech",
);

assert(sliceChars("зефир🩷хвост", 6) === "зефир🩷", "emoji slice");
assert(
  formatTeleprompter("0-3: А. 3-6: Б. 6-9: В.").includes("\n"),
  "teleprompter lines",
);
assert(!/1300/.test(stripPrices("ТК стоит 1300 рублей, берите")), "strip price");
assert(
  isSkeletonScript({
    title: "Сценарий 30 сек",
    format: "Reels 30с",
    hook_options: ["Остановитесь, если ролик умирает на 3-й секунде"],
    teleprompter_script: "0–3с: Хук — смотрите в камеру, без приветствия.",
    caption: "",
    cta: "",
  }),
  "skeleton",
);
assert(
  isSkeletonScript({
    title: "Бенто-торт до и после",
    format: "до/после",
    hook_options: ["А", "Бенто-торт до и после", "Бенто-торт до и после"],
    teleprompter_script:
      "0–3с: Крупный план продукта. Текст на экране — хук без приветствия.",
    caption: "",
    cta: "",
  }),
  "fallback skeleton",
);

const profile: ScrapedProfile = {
  handle: "desertmsk",
  platform: "instagram",
  bio: "Привет, я Алёна. ГОТОВЛЮ ДЕСЕРТЫ НА ЗАКАЗ И ОБУЧАЮ. КУПИТЬ ОБУЧЕНИЕ в шапке.",
  followers: 29236,
  topVideos: [
    {
      id: "1",
      url: "https://instagram.com/p/1",
      views: 9000,
      caption:
        "Собираем бенто-торт из птичьего молока «Клубника со сливками». ТК стоит 1300 рублей. #птичьемолоко",
    },
    {
      id: "2",
      url: "https://instagram.com/p/2",
      views: 8000,
      caption: "Мятный зефир в горьком бельгийском шоколаде. Обучение на сайте.",
    },
    {
      id: "3",
      url: "https://instagram.com/p/3",
      views: 14000,
      caption:
        "Делаем бенто-торт из птичьего молока «Фисташка-малина», одно из моих любимых сочетаний.",
    },
  ],
  recentCaptions: [
    "Лайфхак: как проверить, получился ли зефир? Если отламывается кусочками — всё правильно.",
  ],
};

const insights = buildProfileInsights(profile);
assert(insights.hasWebsiteCta, "website cta");
assert(
  ["РЕЦЕПТ", "ТК", "УРОК"].includes(insights.suggestedKeyword),
  `keyword ${insights.suggestedKeyword}`,
);
assert(insights.prices.some((p) => /1300/.test(p)), "price mined");
assert(insights.captionAngles.length >= 2, "angles");
assert(
  /клубник/i.test(
    hookLine(
      "Готова есть его летом каждый день💔. Зефир из 100% свежей клубники кусочками🔥.",
    ),
  ),
  "hook skips emotion",
);
assert(
  /фисташк/i.test(
    hookLine(
      "Делаем бенто-торт из птичьего молока «Фисташка-малина», одно из моих любимых сочетаний💚.",
    ),
  ) &&
    !/одно из моих$/i.test(
      hookLine(
        "Делаем бенто-торт из птичьего молока «Фисташка-малина», одно из моих любимых сочетаний💚.",
      ),
    ),
  "hook drops trailing clause",
);
assert(sliceWords("Маршмеллоу пружинки с двойным вкусом, без белка, а получается пышное и нежное", 56).endsWith("белка") || !/ н$/.test(sliceWords("Маршмеллоу пружинки с двойным вкусом, без белка, а получается пышное и нежное", 56)), "no mid-word cut");

assert(insights.factCard.withoutClaims.some((c) => /масл/.test(c)) || insights.factCard.allowed.includes("птичье молоко") || insights.factCard.allowed.length >= 1, "fact card");
assert(!/йогурт/.test(scrubInvented("крем на йогурте и бисквит за 5 минут", insights.factCard)), "scrub yogurt");
assert(!/бисквит/.test(scrubInvented("крем на йогурте и бисквит за 5 минут", insights.factCard)), "scrub biscuit");
assert(!/15 минут/.test(scrubInvented("торт за 15 минут. варим 3 минуты", insights.factCard)), "scrub unmatched clickbait");
const mintFacts = buildFactCard("", [
  "Мятный зефир в горьком бельгийском шоколаде. ТК стоит 1300 рублей.",
]);
assert(!/яблочн/.test(scrubInvented("меренга с яблочным пюре и альбумином", mintFacts)), "per-caption apple");
assert(!/10 минут/.test(scrubInvented("готовится 10 минут", mintFacts)), "per-caption minutes");
assert(!/125/.test(scrubInvented("125 г пюре, 5 г альбумина", mintFacts)), "per-caption grams");
assert(!/лимонн/.test(scrubInvented("варим с лимонной кислотой", mintFacts)), "per-caption lemon");
assert(
  !/^\s*из /.test(scrubInvented("бисквит из птичьего молока", insights.factCard)) &&
    /птичьего молока/.test(scrubInvented("бисквит из птичьего молока", insights.factCard)),
  "scrub leftover iz",
);
assert(
  /меньшим сахаром/.test(
    scrubInvented(
      "мармелад без сахара",
      buildFactCard("", ["мармелад с уменьшенным содержанием сахара"]),
    ),
  ),
  "no sugar-free overclaim",
);

const aligned = alignAngles(
  [
    {
      title: "Бенто-торт Фисташка-малина",
      format: "до/после",
      hook_options: ["Фисташка-малина — идеальное сочетание для бенто"],
      teleprompter_script: "Фисташковый крем и малиновое конфи из птичьего молока",
      caption: "Бенто-торт из птичьего молока «Фисташка-малина»",
      cta: "РЕЦЕПТ",
      source_angle: "Собираем бенто-торт из птичьего молока Клубника со сливками",
    },
  ],
  insights,
);
assert(/фисташк/i.test(aligned[0].source_angle || ""), `angle retag ${aligned[0].source_angle}`);

const lone = "пышное \uD83D и нежное";
assert(!/[\uD800-\uDFFF]/.test(stripLoneSurrogates(lone)), "strip lone surrogate");
JSON.stringify(sanitizeForJson({ title: lone, nested: { t: lone } }));

const vision = parseVisionPayload(
  {
    on_screen_text: ["Мятный зефир"],
    product: "зефир в шоколаде",
    process: "обмакивают в шоколад",
    talking_head: false,
    shot_ideas: ["крупно зефир", "руки в шоколаде"],
  },
  "v1",
);
assert(vision.product.includes("зефир"), "vision product");
assert(vision.onScreenText[0] === "Мятный зефир", "vision ocr");

const withVision = mergeVisualNotes(insights, [vision]);
assert(
  withVision.factCard.blob.includes("мятный зефир") ||
    withVision.factCard.allowed.some((t) => /зефир/.test(t)),
  "ocr folded into facts",
);

const assembled = assembleScriptsFromFacts(withVision, "РЕЦЕПТ", "process_no_speech");
assert(assembled.length === 3, "three scripts");
assert(
  assembled.map((s) => s.duration_sec).join(",") === "15,30,45",
  "durations",
);
for (const script of assembled) {
  assert(!isSkeletonScript(script), `not skeleton: ${script.title}`);
  assert((script.shot_list || []).length === 4, `4 shots: ${script.title}`);
  assert(/текст на экране/i.test(script.teleprompter_script), "screen text sufler");
  assert(!/смотрите в камеру/i.test(script.teleprompter_script), "no talking-head");
  assert(
    /напиши рецепт/i.test(script.teleprompter_script),
    "cta in sufler",
  );
  assert(!/\s+(и|в|на|с)$/i.test(script.title), `no trailing prep: ${script.title}`);
}
assert(
  tidyCut("Малиновый мармелад с уменьшенным содержанием сахара в") ===
    "Малиновый мармелад с уменьшенным содержанием сахара",
  "tidy trailing prep",
);
assert(
  assembled.some((s) => /фисташк|клубник|мятн|зефир|птичь/i.test(s.title)),
  "product in assembled title",
);
assert(
  assembled.some((s) => /фисташк|клубник|мятн|зефир|птичь/i.test(s.teleprompter_script)),
  "product in sufler",
);

const fitness: ScrapedProfile = {
  handle: "fitcoach",
  platform: "instagram",
  bio: "Тренировки дома. Программа в шапке.",
  followers: 10000,
  topVideos: [
    {
      id: "a",
      url: "https://instagram.com/p/a",
      views: 5000,
      caption: "Планка 30 секунд: локти под плечами, таз не падает.",
    },
    {
      id: "b",
      url: "https://instagram.com/p/b",
      views: 4000,
      caption: "Ягодичный мост: пятки ближе к тазу, жми вверх на выдохе.",
    },
    {
      id: "c",
      url: "https://instagram.com/p/c",
      views: 3000,
      caption: "Разминка плеч перед жимом: круги руками 20 раз.",
    },
  ],
};
const fitScripts = assembleScriptsFromFacts(
  buildProfileInsights(fitness),
  "ПЛАН",
  "process_no_speech",
);
assert(
  fitScripts.some((s) => /планка|ягодичн|плеч/i.test(`${s.title} ${s.teleprompter_script}`)),
  "fitness angle kept",
);
assert(
  !fitScripts.some((s) => /десерт|разлом/i.test(`${s.title} ${s.teleprompter_script} ${s.caption} ${(s.shot_list || []).join(" ")}`)),
  "no dessert leak into other niche",
);

assert(isTruncatedAngle("Отправь подруге, пусть знает, что"), "truncated что");
assert(isMostlyLatin("Come to train my abs, ended up training my fall"), "latin hook");
assert(
  isPromoAngle("Кстати, в моем Телеграм-канале вас ждут другие рецепты и советы"),
  "telegram promo",
);
assert(
  isPromoAngle("подписывайтесь котики мои сладкие на мой пиздатенький тик ток"),
  "tiktok promo",
);
assert(isPromoAngle("Поздравляем нашего победителя"), "contest promo");
assert(!isPromoAngle("Мятный зефир в горьком бельгийском шоколаде"), "product not promo");
assert(isMostlyLatin("Come to train my abs, ended up training my fall"), "latin hook");
assert(!hasProfileMedia({ handle: "x", platform: "instagram", bio: "", followers: 0, topVideos: [] }), "empty scrape");

const talking = assembleScriptsFromFacts(
  insights,
  "РЕЦЕПТ",
  "talking_head",
  {
    transcriptions: [
      "Смотрите, если зефир отламывается кусочками — значит сироп добит правильно.",
    ],
  },
);
assert(/в камеру/i.test(talking[0].teleprompter_script), "talking-head sufler");
assert(!/без речи в камеру/i.test(talking[0].teleprompter_script), "no silent scaffold");
assert(/зефир отламывается/i.test(talking[0].teleprompter_script), "spoken beat");

const fitEn: ScrapedProfile = {
  handle: "fiten",
  platform: "instagram",
  bio: "Everyday training",
  followers: 1000,
  topVideos: [
    {
      id: "a",
      url: "https://instagram.com/p/a",
      views: 9000,
      caption: "Come to train my abs, ended up training my fall lol",
    },
  ],
};
const fitEnInsights = mergeVisualNotes(buildProfileInsights(fitEn), [
  {
    videoId: "a",
    onScreenText: ["жгут"],
    product: "тренировочный резиновый жгут",
    process: "девушка выполняет упражнения с жгутом",
    talkingHead: false,
    shotIdeas: ["жгут на перекладине", "упражнение на спину"],
  },
]);
const fitEnScripts = assembleScriptsFromFacts(fitEnInsights, "ГАЙД", "process_no_speech");
assert(
  /жгут|упражнен/i.test(`${fitEnScripts[0].title} ${fitEnScripts[0].teleprompter_script} ${(fitEnScripts[0].shot_list || []).join(" ")}`),
  "ocr beats english caption",
);
assert(!/come to train/i.test(fitEnScripts[0].title), "english caption not title");
assert(hasScriptSignal(fitEnInsights), "ocr gives signal");

assert(
  isBrokenNiche("тренировочный резиновый жгут; объятия. 9:00"),
  "concatenated hooks are broken niche",
);
assert(
  isBrokenNiche("убитой, Я не дизайнер, яркая ванная"),
  "broken niche fragments",
);
assert(
  /десерт|обуча/.test(nicheFromInsights(insights).toLowerCase()),
  "niche from bio not hook dump",
);

const psych: ScrapedProfile = {
  handle: "zoyaniki",
  platform: "instagram",
  bio: "Школа макияжа и психология женственности. Запись в шапке.",
  followers: 80000,
  topVideos: [
    {
      id: "cake",
      url: "https://instagram.com/p/cake",
      views: 900000,
      caption: "А вы можете заказать самые вкусные и красивые тортики у моей мамули",
    },
    {
      id: "p1",
      url: "https://instagram.com/p/p1",
      views: 40000,
      caption: "То что доставляет нам дискомфорт на самом деле наша граница",
    },
    {
      id: "p2",
      url: "https://instagram.com/p/p2",
      views: 35000,
      caption: "Сколько пунктов отозвалось тебе лично по этой психологии",
    },
  ],
};
const psychInsights = buildProfileInsights(psych);
assert(isOfftopicAngle(psychInsights.captionAngles[0], psychInsights), "cakes offtopic");
const psychScripts = assembleScriptsFromFacts(psychInsights, "УРОК", "talking_head");
assert(
  !psychScripts.some((s) => /торт/i.test(`${s.title} ${s.source_angle}`)),
  "offtopic cakes not a script",
);
assert(
  psychScripts.some((s) => /дискомфорт|отозвалось|психолог/i.test(`${s.title} ${s.source_angle}`)),
  "psych angle kept",
);
assert(/макияж|психолог/.test(nicheFromInsights(psychInsights).toLowerCase()), "psych niche from bio");

const chefPromo: ScrapedProfile = {
  handle: "ivlevchef",
  platform: "instagram",
  bio: "Шеф-повар. Рецепты и советы с кухни.",
  followers: 1000000,
  topVideos: [
    {
      id: "m",
      url: "https://instagram.com/p/m",
      views: 20000,
      caption: "Праздники-то продолжаются. Ловите рецепт мимозы с кухни.",
    },
    {
      id: "tg",
      url: "https://instagram.com/p/tg",
      views: 18000,
      caption: "Кстати, в моем Телеграм-канале вас ждут другие рецепты и советы, а ещё разборы",
    },
    {
      id: "yt",
      url: "https://instagram.com/p/yt",
      views: 15000,
      caption: "Новый выпуск Еда и Деньги с @ivlevchef смотрите на YouTube и VK Видео",
    },
  ],
};
const chefScripts = assembleScriptsFromFacts(
  buildProfileInsights(chefPromo),
  "РЕЦЕПТ",
  "talking_head",
);
assert(
  !chefScripts.some((s) => /телеграм-канал|youtube и vk/i.test(`${s.title} ${s.source_angle}`)),
  "promo not a script",
);
assert(
  chefScripts.some((s) => /мимоз|праздник/i.test(`${s.title} ${s.source_angle}`)),
  "recipe angle kept",
);
assert(
  /ванн|жгут|планка/i.test(nicheFromInsights(fitEnInsights)) ||
    /жгут/i.test(nicheFromInsights(fitEnInsights)),
  "niche from strong angle",
);

const constrained = constrainFacts(
  {
    niche: "убитой, Я не дизайнер",
    target_audience: "Домашние кондитеры и любители десертов в РФ/СНГ",
    content_pillars: [{ title: "Процесс", description: "x" }],
    profile_audit_tips: ["a", "b", "c"],
    scripts: fitEnScripts,
  },
  fitEnInsights,
);
assert(!/убитой/i.test(constrained.niche), "replace broken niche");
assert(!/кондитеры/i.test(constrained.target_audience), "no dessert audience leak");

assert(isNonRussianCopy("ลูกนึกว่าถ่ายภาพนิ่ง สานสัมพันธ์พี่น้อง"), "thai copy");
assert(isNonRussianCopy("何気ない道をのんびり歩く。"), "japanese copy");
assert(!isNonRussianCopy("тренировочный резиновый жгут"), "russian product");

const thaiOcr = mergeVisualNotes(
  buildProfileInsights({
    handle: "media",
    platform: "instagram",
    bio: "медиа",
    followers: 1000,
    topVideos: [
      {
        id: "th",
        url: "https://instagram.com/p/th",
        views: 8000,
        caption: "танцуют и показывают жесты на семейном празднике",
      },
    ],
  }),
  [
    {
      videoId: "th",
      onScreenText: ["ลูกนึกว่าถ่ายภาพนิ่ง", "танцуют и показывают жесты"],
      product: "ลูกนึกว่าถ่ายภาพนิ่ง",
      process: "танцуют",
      talkingHead: false,
      shotIdeas: ["ลูกนึกว่าถ่ายภาพนิ่ง"],
    },
  ],
);
assert(
  !thaiOcr.captionAngles.some((a) => /[\u0E00-\u0E7F]/.test(a.hookLine)),
  "thai ocr not a hook",
);
assert(
  !thaiOcr.visualNotes.some((n) => n.onScreenText.some((t) => /[\u0E00-\u0E7F]/.test(t))),
  "thai ocr stripped",
);

const jpOnly = buildProfileInsights({
  handle: "livemaster",
  platform: "instagram",
  bio: "ワンダーサーイ",
  followers: 10,
  topVideos: [
    {
      id: "jp",
      url: "https://instagram.com/p/jp",
      views: 8,
      caption: "何気ない道をのんびり歩く。",
    },
  ],
});
assert(!hasScriptSignal(jpOnly), "japanese-only profile has no signal");
assert(
  assembleScriptsFromFacts(jpOnly, "ГАЙД", "process_no_speech").length === 0,
  "no scripts from japanese-only",
);

const talkingBeats = assembleScriptsFromFacts(
  insights,
  "РЕЦЕПТ",
  "talking_head",
  {
    clips: [
      {
        videoId: "1",
        text: "Смотрите, если зефир отламывается кусочками — значит сироп добит правильно.",
      },
      {
        videoId: "2",
        text: "Мятный зефир лучше обмакивать в горький шоколад, так вкуснее и стабильнее.",
      },
      {
        videoId: "3",
        text: "Фисташка и малина в бенто работают, если крем не слишком жидкий.",
      },
    ],
  },
);
assert(
  talkingBeats.some((s) => /зефир отламывается/.test(s.teleprompter_script)),
  "beat video 1",
);
assert(
  talkingBeats.some((s) => /обмакивать|мятный зефир лучше/.test(s.teleprompter_script)),
  "beat video 2",
);
assert(
  talkingBeats.some((s) => /фисташка и малина/i.test(s.teleprompter_script.toLowerCase())),
  "beat video 3",
);
assert(
  new Set(talkingBeats.map((s) => s.teleprompter_script)).size === 3,
  "three different spoken beats",
);

const lie = {
  AITUNNEL_API_KEY: "sk-test",
  APIFY_TOKEN: "",
  RAPIDAPI_KEY: "",
};
assert(resolveHonesty(lie).mode === "blocked", "live AI + no scrape = blocked");
assert(!allowMockProfile(lie), "do not mock when only AI key exists");
try {
  assertCanAnalyzeProfile("instagram", lie);
  throw new Error("lie path must throw");
} catch (error) {
  assert(error instanceof HonestyError, "HonestyError");
  assert(
    error instanceof HonestyError && error.message === NO_SCRAPE_LIVE_MESSAGE,
    "no-scrape copy",
  );
}

const demo = {};
assert(resolveHonesty(demo).mode === "demo", "no keys = demo");
assert(allowMockProfile(demo), "full demo allowed");

const live = { APIFY_TOKEN: "apify", AITUNNEL_API_KEY: "sk" };
assert(resolveHonesty(live).mode === "live", "both keys = live");
assert(allowMockProfile({ ALLOW_MOCK_PROFILE: "true", ...lie }), "explicit demo");

try {
  assertCanAnalyzeProfile("youtube", live);
  throw new Error("youtube must throw");
} catch (error) {
  assert(error instanceof HonestyError, "youtube HonestyError");
  assert(
    error instanceof HonestyError &&
      error.message === YOUTUBE_UNSUPPORTED_MESSAGE,
    "youtube copy",
  );
}

assert(
  isMockScrapedProfile({
    source: "mock",
    topVideos: [{ id: "v1", audioUrl: "https://example.com/audio/1.mp3" }],
  }),
  "tagged mock",
);
assert(
  !isMockScrapedProfile({
    source: "live",
    topVideos: [{ id: "1", audioUrl: "https://instagram.com/x.mp4" }],
  }),
  "tagged live",
);

const pasted = parseSubmittedReels(
  [
    "https://www.instagram.com/reel/AbC123/ торт без сахара, 12 тыс просмотров",
    "https://instagram.com/reel/DeF456/ разлом зефира",
  ].join("\n"),
);
assert(pasted.length === 2, "two pasted reels");
assert(pasted[0].views === 12000, "insights views");
assert(/торт без сахара/.test(pasted[0].caption || ""), "caption kept");
assert(!/\//.test(pasted[0].caption || ""), "no leftover slash");
assert(hasEnoughSubmittedReels(pasted), "enough user reels");
assert(parseViewsHint("8.4k views") === 8400, "k views");
assertCanAnalyzeProfile("instagram", lie, { hasUserReels: true });

console.log("check-quality: ok", {
  keyword: insights.suggestedKeyword,
  products: insights.products.slice(0, 4),
  prices: insights.prices,
});
