import Link from "next/link";

import { CtaLink } from "@/components/marketing/primitives";
import { botUsername } from "@/lib/config";

const NAV = [
  { href: "#how", label: "Как работает" },
  { href: "#example", label: "Пример" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#faq", label: "Вопросы" },
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-[1.05rem] font-bold tracking-[-0.04em] ${className ?? ""}`}
    >
      Reels<span className="text-primary">Factory</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center justify-between gap-6 px-5 sm:px-8">
        <Wordmark className="text-ink" />

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[0.86rem] font-medium text-ink/60 transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`https://t.me/${botUsername()}`}
            className="hidden text-[0.86rem] font-medium text-ink/60 transition-colors hover:text-ink sm:inline"
          >
            В Telegram
          </a>
          <CtaLink href="/app" size="sm" tone="ink">
            Начать разбор
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
