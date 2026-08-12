import type { Metadata, Viewport } from "next";
import { Unbounded } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const unbounded = Unbounded({
  subsets: ["cyrillic", "latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ReelsFactory — сценарии для Reels, VK и Telegram",
    template: "%s — ReelsFactory",
  },
  description:
    "Разбор профиля и готовые сценарии с суфлёром. Снял раз — выложи в Reels, VK Клипы и Telegram.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14110f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
