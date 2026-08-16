import type { Metadata, Viewport } from "next";

import { TelegramProvider } from "@/components/telegram/telegram-provider";

import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-dvh font-sans antialiased">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
