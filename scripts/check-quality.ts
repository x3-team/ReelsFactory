import { sliceChars } from "@/lib/ai/safe-json";
import { isUsableTranscript } from "@/lib/ai/speech-signal";
import { formatTeleprompter, humanizeKeyword, stripPrices } from "@/lib/ai/sanitize-scripts";
import { isSkeletonScript } from "@/lib/ai/repair-scripts";
import { buildProfileInsights } from "@/lib/content/profile-insights";
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
assert(insights.products.some((p) => /бенто|зефир|птич/i.test(p)), "product");

console.log("check-quality: ok", {
  keyword: insights.suggestedKeyword,
  products: insights.products.slice(0, 4),
  prices: insights.prices,
});
