import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";

import { TelegramProvider } from "@/components/telegram/telegram-provider";

import "./globals.css";

/** Onest — спокойный UI-шрифт с нормальной кириллицей (без «мельтешения» Unbounded) */
const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ReelsFactory",
  description:
    "AI Telegram Mini App: анализ профилей и генерация сценариев для Reels с суфлёром.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#11131A" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${onest.variable} font-sans antialiased`}>
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
