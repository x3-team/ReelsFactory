import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ReelsFactory — растим твою аудиторию в коротких видео",
  description:
    "Разбираем твой Instagram или TikTok и даём инструменты роста: сценарии с суфлёром, съёмочный день, ремейки и воронку в Telegram. Бесплатно: разбор аккаунта + 1 сценарий за 1–2 минуты.",
  openGraph: {
    title: "ReelsFactory — растим твою аудиторию в коротких видео",
    description:
      "Хуки из твоих же залетевших роликов, а не из чужих шаблонов. Сценарии с суфлёром, съёмочный день, кросс‑пакет и воронка в комментарии.",
    locale: "ru_RU",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
