import type { Metadata } from "next";

import { ReelsFactoryApp } from "@/components/app/reels-factory-app";

export const metadata: Metadata = {
  title: "Разбор профиля",
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <ReelsFactoryApp />;
}
