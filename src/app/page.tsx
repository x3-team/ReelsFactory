import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ReelsFactory — сценарии рилсов под твой профиль за 60 секунд",
  description:
    "AI разбирает Instagram / TikTok / YouTube и выдаёт готовые сценарии с суфлёром. Бесплатно: разбор профиля + 1 полный сценарий.",
};

export default function HomePage() {
  return <LandingPage />;
}
