import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { TelegramProvider } from "@/components/telegram/telegram-provider";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ReelsFactory",
  description:
    "Вставил Instagram или TikTok — получил сценарии, которые можно читать с суфлёра в камеру.",
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
        className={`${geistSans.variable} min-h-dvh font-sans antialiased`}
      >
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
