"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  Gift,
  MessageCircle,
  Sparkles,
  Video,
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/config";
import { botUsername } from "@/lib/config";
import { legalEntity } from "@/lib/legal";

const APP_HREF = "/app";
const TG_HREF = `https://t.me/${botUsername()}`;
const SHOT_W = 780;
const SHOT_H = 1688;

export function LandingPage() {
  useEffect(() => {
    const tg = (
      window as Window & {
        Telegram?: { WebApp?: { initData?: string } };
      }
    ).Telegram?.WebApp;
    if (tg?.initData) {
      window.location.replace(APP_HREF);
    }
  }, []);

  return (
    <div className="rf-landing min-h-dvh overflow-x-hidden bg-background text-foreground">
      <Hero />
      <ProofStrip />
      <How />
      <Product />
      <Pricing />
      <Audience />
      <Offer />
      <LandingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 55% at 85% 0%, hsl(12 86% 56% / 0.28), transparent 52%), radial-gradient(60% 40% at 8% 88%, hsl(20 30% 18% / 0.55), transparent 50%), linear-gradient(180deg, hsl(20 14% 6%) 0%, hsl(20 12% 8%) 100%)",
        }}
      />
      <div aria-hidden className="rf-grain pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 pb-12 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
        <header className="sticky top-0 z-20 -mx-5 mb-8 flex items-center justify-between bg-gradient-to-b from-background via-background/90 to-transparent px-5 pb-4 pt-[max(0.4rem,env(safe-area-inset-top))] md:-mx-8 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="font-display text-lg font-semibold tracking-tight">
              Reels<span className="text-primary">Factory</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={APP_HREF}
              className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline"
            >
              Войти
            </Link>
            <Button asChild size="sm" className="h-10 px-4">
              <Link href={APP_HREF}>
                Разобрать профиль
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="rf-rise space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">
              <Sparkles className="size-3.5" />
              Бесплатно: разбор + 1 сценарий · 1–2 минуты
            </p>
            <h1 className="font-display max-w-[16ch] text-[2.35rem] font-semibold leading-[1.08] tracking-tight md:text-6xl md:leading-[1.05]">
              Снял раз — выложи в Reels, VK и Telegram
            </h1>
            <p className="max-w-[38ch] text-[1.08rem] leading-7 text-muted-foreground">
              Разберём твои залетевшие ролики и соберём сценарии с суфлёром:
              хук → проблема → демо → CTA. Не простыня из ChatGPT — текст под
              твой аккаунт.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="rf-cta h-12 px-6 text-base">
                <Link href={APP_HREF}>
                  <Clapperboard className="size-4" />
                  Разобрать мой профиль
                </Link>
              </Button>
              <a
                href={TG_HREF}
                className="text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:text-left"
              >
                или открыть в Telegram
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Карту не спрашиваем. Платишь, только когда захочешь снимать пачками.
            </p>
          </div>

          <div className="rf-rise relative mx-auto w-full max-w-[420px] [animation-delay:120ms]">
            <HeroPhones />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPhones() {
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-[380px] md:h-[540px]">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl"
      />
      <PhoneShot
        src="/landing/scripts.png"
        alt="Сценарий с хуками и суфлёром"
        className="absolute left-0 top-10 w-[58%] -rotate-[8deg]"
      />
      <PhoneShot
        src="/landing/teleprompter.png"
        alt="Суфлёр на одном телефоне"
        priority
        className="absolute right-0 top-0 z-10 w-[62%] rotate-[7deg]"
      />
    </div>
  );
}

function PhoneShot({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[1.65rem] border border-white/12 bg-card shadow-[0_28px_70px_-24px_rgba(0,0,0,0.85)] ${className ?? ""}`}
    >
      <Image
        src={src}
        alt={alt}
        width={SHOT_W}
        height={SHOT_H}
        priority={priority}
        sizes="(min-width: 768px) 240px, 60vw"
        className="block h-auto w-full"
      />
    </div>
  );
}

function ProofStrip() {
  const items = [
    "15 / 30 / 45 сек",
    "Reels + VK Клипы + Telegram",
    "Суфлёр на одном телефоне",
    "Воронка: коммент → бот",
  ];
  return (
    <section className="border-y border-border/70 bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-4 text-[13px] font-medium text-muted-foreground md:px-8">
        {items.map((item) => (
          <span key={item} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function How() {
  const steps = [
    {
      n: "01",
      t: "Кидаешь @ник",
      d: "Instagram или TikTok. Смотрим био и ролики, которые уже залетали — не чужие шаблоны.",
    },
    {
      n: "02",
      t: "Собираем машину контента",
      d: "Ниша, столпы, хуки, съёмочный день и пакет под три площадки. Один образ — пачка роликов.",
    },
    {
      n: "03",
      t: "Читаешь суфлёр и снимаешь",
      d: "Таймкоды хук → проблема → демо → CTA. Выложил в Reels, Клипы и Telegram без переписывания.",
    },
  ];
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-[13px] font-medium text-primary">Как это работает</p>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Три шага — и ты уже в кадре
        </h2>
        <ol className="mt-10 space-y-0">
          {steps.map((step) => (
            <li
              key={step.n}
              className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-border/70 py-7 first:pt-0 last:border-0"
            >
              <span className="font-display text-sm font-semibold tabular-nums text-primary">
                {step.n}
              </span>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight">
                  {step.t}
                </p>
                <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">
                  {step.d}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Product() {
  const shots = [
    {
      src: "/landing/scripts.png",
      title: "Сценарии",
      d: "Три хука, пропы, суфлёр с таймкодами. Слово‑CTA для комментария.",
    },
    {
      src: "/landing/shoot.png",
      title: "Съёмочный день",
      d: "Один образ, порядок дублей, календарь на 7 дней, воронка в Telegram.",
    },
    {
      src: "/landing/studio.png",
      title: "Студия",
      d: "Ремейк чужого вируса под себя и разбор «почему не залетело».",
    },
  ];
  return (
    <section className="border-t border-border/70 bg-card/30 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-[13px] font-medium text-primary">Продукт</p>
        <h2 className="font-display mt-2 max-w-[18ch] text-3xl font-semibold tracking-tight md:text-4xl">
          Не идеи «о чём снять». Готовый текст в камеру.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {shots.map((shot) => (
            <figure
              key={shot.title}
              className="overflow-hidden rounded-3xl border border-border bg-card"
            >
              <Image
                src={shot.src}
                alt={shot.title}
                width={SHOT_W}
                height={SHOT_H}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="aspect-[9/14] w-full object-cover object-top"
              />
              <figcaption className="space-y-1 p-4">
                <p className="font-display font-semibold">{shot.title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{shot.d}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const cards = [
    {
      id: "FREE" as const,
      note: "Попробовать",
      points: ["Разбор профиля", "1 тизер‑сценарий", "Превью пакета и съёмки"],
    },
    {
      id: "START" as const,
      note: "Для автора",
      points: ["12 сценариев / мес", "4 анализа", "Reels + VK + Telegram", "Съёмочный день"],
    },
    {
      id: "PRO" as const,
      note: "Рекомендуем",
      points: ["30 сценариев", "10 анализов", "10 ремейков", "10 разборов «не залетело»"],
      featured: true,
    },
    {
      id: "AGENCY" as const,
      note: "Для студии",
      points: ["До 5 клиентов", "100 сценариев", "Студия 30+30", "Отчёт для клиента"],
    },
  ];

  return (
    <section id="pricing" className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-[13px] font-medium text-primary">Цены без мелкого шрифта</p>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Платишь, когда пачка нужна
        </h2>
        <p className="mt-3 max-w-[44ch] text-[1.05rem] leading-7 text-muted-foreground">
          Бесплатный разбор — чтобы увидеть свой тон на экране. Старт — чтобы
          снимать каждую неделю. Про — если уже гоняешь хуки и ремейки.
        </p>
        <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const plan = PLANS[card.id];
            return (
              <div
                key={card.id}
                className={`flex flex-col rounded-3xl border p-5 ${
                  card.featured
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg font-semibold">{plan.name}</p>
                  {card.featured ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      {card.note}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{card.note}</span>
                  )}
                </div>
                <p className="mt-3 font-display text-3xl font-semibold">
                  {plan.priceRub === 0 ? "0 ₽" : `${plan.priceRub} ₽`}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {plan.priceRub === 0 ? "" : "/ мес"}
                  </span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  {card.points.map((p) => (
                    <li key={p}>· {p}</li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={card.featured ? "default" : "outline"}
                  className="mt-5 w-full"
                >
                  <Link href={APP_HREF}>
                    {plan.priceRub === 0 ? "Попробовать" : "Выбрать"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Gift className="size-4 text-primary" />
          Рефералка: 30% с первой оплаты друга, 10% с продлений — на баланс или в
          скидку тарифа.
        </p>
      </div>
    </section>
  );
}

function Audience() {
  const roles = [
    {
      icon: Video,
      t: "Салон, клиника, эксперт",
      d: "Один съёмочный день закрывает неделю. В ролике — слово в комментарий, бот отдаёт гайд.",
    },
    {
      icon: Sparkles,
      t: "Автор, который выгорел на «что снимать»",
      d: "Хуки из твоих же залетевших роликов. Не копируешь чужой вирус — переснимаешь структуру под себя.",
    },
    {
      icon: MessageCircle,
      t: "SMM и агентства",
      d: "До 5 клиентских аккаунтов, квоты и отчёт. Бриф больше не живёт в переписке.",
    },
  ];
  return (
    <section className="border-t border-border/70 bg-card/30 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-[13px] font-medium text-primary">Для кого</p>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Если снимаешь для СНГ — это твой конвейер
        </h2>
        <ul className="mt-10 space-y-6">
          {roles.map((role) => (
            <li key={role.t} className="flex gap-4">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <role.icon className="size-4" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold">{role.t}</p>
                <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
                  {role.d}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Offer() {
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-primary/30 bg-primary/10 p-6 md:p-10">
        <p className="text-[13px] font-medium text-primary">Оффер</p>
        <h2 className="font-display mt-2 max-w-[16ch] text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.08]">
          Сегодня разбор. Сегодня первый ролик.
        </h2>
        <p className="mt-4 max-w-[42ch] text-[1.05rem] leading-7 text-muted-foreground">
          Бесплатно разбираем профиль и даём 1 сценарий с суфлёром. Без карты.
          Если зайдёт — Старт 590 ₽, чтобы снимать пачками.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="rf-cta h-12 px-6 text-base">
            <Link href={APP_HREF}>
              Разобрать мой профиль
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">Обычно 1–2 минуты.</p>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const year = new Date().getFullYear();
  const legal = legalEntity();

  return (
    <footer className="border-t border-border/70 bg-card/40 px-5 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8">
        <div className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <p className="font-display text-lg font-semibold">
            Reels<span className="text-primary">Factory</span>
          </p>
        </div>
        <p className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
          Сценарии коротких видео для авторов и экспертов СНГ. Снял раз — выложи
          в Reels, VK Клипы и Telegram.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">Документы</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/legal/offer" className="hover:text-primary">
                  Публичная оферта
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-primary">
                  Пользовательское соглашение
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-primary">
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">Реквизиты</p>
            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-muted-foreground">
              <li>{legal.name}</li>
              <li>ИНН: {legal.inn}</li>
              {legal.ogrnip ? <li>ОГРНИП: {legal.ogrnip}</li> : null}
              <li>{legal.address}</li>
              <li>
                Email:{" "}
                <a href={`mailto:${legal.email}`} className="hover:text-foreground">
                  {legal.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="text-[12px] leading-5 text-muted-foreground">
          © {year} {legal.brand}. Используя сервис, вы принимаете оферту и
          политику конфиденциальности.
        </p>
      </div>
    </footer>
  );
}
