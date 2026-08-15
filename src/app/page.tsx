import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ReelsFactory — растим твою аудиторию в коротких видео",
  description:
    "Вставляете 3–5 своих рилсов — получаете сценарий с суфлёром. Не притворяемся, что открыли аккаунт. Бесплатно: 1 сценарий за 1–2 минуты.",
  openGraph: {
    title: "ReelsFactory — растим твою аудиторию в коротких видео",
    description:
      "Хуки из твоих же роликов, а не из чужих шаблонов. Сценарий с суфлёром в том же сеансе. Кросспост не обещаем.",
    locale: "ru_RU",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
