import { sanitizeForJson, sliceChars, sliceWords, stripLoneSurrogates } from "@/lib/ai/safe-json";
import { isUsableTranscript } from "@/lib/ai/speech-signal";
import { formatTeleprompter, humanizeKeyword, stripPrices } from "@/lib/ai/sanitize-scripts";
import { isSkeletonScript } from "@/lib/ai/repair-scripts";
import { assembleScriptsFromFacts, tidyCut } from "@/lib/ai/assemble-scripts";
import { parseVisionPayload } from "@/lib/ai/vision-frames";
import { alignAngles, scrubInvented } from "@/lib/ai/constrain-facts";
import {
  buildFactCard,
  buildProfileInsights,
  hookLine,
  mergeVisualNotes,
} from "@/lib/content/profile-insights";
import type { ScrapedProfile } from "@/lib/types";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(!isUsableTranscript("Thank you for watching!"), "stock en");
assert(!isUsableTranscript("チャンネル登録をお願いいたします。"), "stock jp");
assert(!isUsableTranscript("200°C-392°F 10-15分"), "cjk recipe");
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

console.log("check-quality: ok", {
  keyword: insights.suggestedKeyword,
  products: insights.products.slice(0, 4),
  prices: insights.prices,
});
