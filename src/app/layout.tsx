import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";

import { TelegramProvider } from "@/components/telegram/telegram-provider";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
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
      <body
        className={`${manrope.variable} ${unbounded.variable} font-sans antialiased`}
      >
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
