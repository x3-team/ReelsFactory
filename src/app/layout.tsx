import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { TelegramProvider } from "@/components/telegram/telegram-provider";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const onest = localFont({
  src: "./fonts/Onest-latin-cyrillic.woff2",
  variable: "--font-onest",
  weight: "300 800",
  display: "swap",
});

const unbounded = localFont({
  src: "./fonts/Unbounded-latin-cyrillic.woff2",
  variable: "--font-unbounded",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "ReelsFactory — вставил профиль, получил текст в камеру",
    template: "%s · ReelsFactory",
  },
  description:
    "Разбираем твои рилсы в Instagram и TikTok и отдаём три сценария — 15, 30 и 45 секунд. Их не надо переписывать: включаешь суфлёр и читаешь с экрана.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "ReelsFactory",
    title: "ReelsFactory — вставил профиль, получил текст в камеру",
    description:
      "Разбор твоего профиля, три сценария на 15/30/45 секунд и суфлёр, с которого можно читать прямо в камеру.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F0E8" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1410" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${onest.variable} ${unbounded.variable} ${geistSans.variable} min-h-dvh font-sans antialiased`}
      >
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
