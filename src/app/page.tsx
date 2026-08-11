import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ReelsFactory — расти в Reels проще, без ступора «что снимать»",
  description:
    "Разберём твой профиль и выдадим готовые сценарии с суфлёром — чтобы расти в аудитории быстрее. Бесплатно: разбор + 1 сценарий под съёмку.",
};

export default function HomePage() {
  return <LandingPage />;
}
