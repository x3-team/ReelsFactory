import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ReelsFactory — снял раз, выложи в Reels, VK и Telegram",
  description:
    "Разберём твой Instagram или TikTok и выдадим сценарии с суфлёром: хук → проблема → демо → CTA. Бесплатно: разбор профиля + 1 сценарий за 1–2 минуты.",
  openGraph: {
    title: "ReelsFactory — снял раз, выложи в Reels, VK и Telegram",
    description:
      "Сценарии под твой аккаунт, не под нейросеть. Суфлёр, кросс‑пакет и воронка в комментарии.",
    locale: "ru_RU",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
