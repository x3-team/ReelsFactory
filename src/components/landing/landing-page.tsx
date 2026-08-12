"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Gift,
  MessageCircle,
  Minus,
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

const NAV = [
  { href: "#how", label: "Как работает" },
  { href: "#product", label: "Продукт" },
  { href: "#pricing", label: "Цены" },
  { href: "#faq", label: "Вопросы" },
];

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
      <SiteNav />
      <Hero />
      <ProofStrip />
      <How />
      <Product />
      <Compare />
      <Pricing />
      <Audience />
      <Faq />
      <Offer />
      <LandingFooter />
      <MobileCtaBar />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Reels<span className="text-primary">Factory</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={APP_HREF}
            className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline"
          >
            Войти
          </Link>
          <Button asChild size="sm" className="h-10 px-4">
            <Link href={APP_HREF}>
              <span className="sm:hidden">Начать</span>
              <span className="hidden sm:inline">Разобрать профиль</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
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
            "radial-gradient(80% 55% at 85% -10%, hsl(12 86% 56% / 0.3), transparent 55%), radial-gradient(60% 40% at 8% 92%, hsl(20 30% 18% / 0.6), transparent 52%), linear-gradient(180deg, hsl(20 14% 6%) 0%, hsl(20 12% 8%) 100%)",
        }}
      />
      <div aria-hidden className="rf-grain pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="rf-rise space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">
            <Sparkles className="size-3.5" />
            Бесплатно: разбор + 1 сценарий · 1–2 минуты
          </p>
          <h1 className="font-display max-w-[16ch] text-[2.35rem] font-semibold leading-[1.08] tracking-tight md:text-6xl md:leading-[1.05]">
            Снял раз — выложи в Reels, VK и Telegram
          </h1>
          <p className="max-w-[40ch] text-[1.08rem] leading-7 text-muted-foreground">
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
    </section>
  );
}

function HeroPhones() {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[320px] sm:max-w-[380px] md:h-[520px]">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl"
      />
      <PhoneShot
        src="/landing/shoot.png"
        alt="Съёмочный день и воронка в Telegram"
        objectPosition="50% 34%"
        className="absolute left-0 top-14 w-[56%] -rotate-[9deg]"
      />
      <PhoneShot
        src="/landing/scripts.png"
        alt="Готовый сценарий с хуком и таймкодами"
        objectPosition="50% 30%"
        priority
        className="absolute right-0 top-0 z-10 w-[64%] rotate-[6deg]"
      />
      <p className="absolute -left-2 bottom-0 z-20 w-max rounded-full border border-white/10 bg-card/90 px-3.5 py-2 text-[12px] font-medium text-muted-foreground shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur">
        <span className="text-foreground">15 / 30 / 45 сек</span> · суфлёр с
        таймкодами
      </p>
    </div>
  );
}

function PhoneShot({
  src,
  alt,
  className,
  objectPosition,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  objectPosition: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[1.65rem] border border-white/12 bg-card shadow-[0_28px_70px_-24px_rgba(0,0,0,0.85)] ${className ?? ""}`}
    >
      <div className="relative">
        <Image
          src={src}
          alt={alt}
          width={SHOT_W}
          height={SHOT_H}
          priority={priority}
          sizes="(min-width: 768px) 260px, 60vw"
          style={{ objectPosition }}
          className="block aspect-[9/17] w-full object-cover"
        />
        <ShotFade />
      </div>
    </div>
  );
}

function ShotFade() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background/95 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/95 to-transparent"
      />
    </>
  );
}

function ProofStrip() {
  const items = [
    "Instagram и TikTok",
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-primary">{children}</p>;
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
    <section id="how" className="scroll-mt-20 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionLabel>Как это работает</SectionLabel>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Три шага — и ты уже в кадре
        </h2>
        <ol className="mt-10 space-y-0">
          {steps.map((step) => (
            <li
              key={step.n}
              className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-border/70 py-7 first:pt-0 last:border-0 last:pb-0"
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
      pos: "50% 33%",
      title: "Сценарии",
      d: "Три хука, пропы, суфлёр с таймкодами. Слово‑CTA для комментария.",
    },
    {
      src: "/landing/shoot.png",
      pos: "50% 30%",
      title: "Съёмочный день",
      d: "Один образ, порядок дублей, календарь на 7 дней, воронка в Telegram.",
    },
    {
      src: "/landing/studio.png",
      pos: "50% 28%",
      title: "Студия",
      d: "Ремейк чужого вируса под себя и разбор «почему не залетело».",
    },
  ];
  return (
    <section
      id="product"
      className="scroll-mt-20 border-t border-border/70 bg-card/30 px-5 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionLabel>Продукт</SectionLabel>
        <h2 className="font-display mt-2 max-w-[18ch] text-3xl font-semibold tracking-tight md:text-4xl">
          Не идеи «о чём снять». Готовый текст в камеру.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {shots.map((shot) => (
            <figure
              key={shot.title}
              className="overflow-hidden rounded-3xl border border-border bg-card"
            >
              <div className="relative">
                <Image
                  src={shot.src}
                  alt={shot.title}
                  width={SHOT_W}
                  height={SHOT_H}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  style={{ objectPosition: shot.pos }}
                  className="aspect-[9/11] w-full object-cover"
                />
                <ShotFade />
              </div>
              <figcaption className="space-y-1 border-t border-border/70 p-4">
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

function Compare() {
  const rows = [
    {
      q: "Откуда берётся идея",
      chat: "Из среднего интернета",
      copy: "Из чужого аккаунта",
      rf: "Из твоих роликов, которые уже залетали",
    },
    {
      q: "Что получаешь на руки",
      chat: "Простыня текста",
      copy: "«Сними как он»",
      rf: "Хук → проблема → демо → CTA с таймкодами и суфлёром",
    },
    {
      q: "Площадки",
      chat: "Переписывать вручную",
      copy: "Одна",
      rf: "Reels + VK Клипы + Telegram одним пакетом",
    },
    {
      q: "Что делать после сценария",
      chat: "Думать самому",
      copy: "Гадать",
      rf: "Съёмочный день, календарь на 7 дней, слово‑CTA в комментарий",
    },
  ];
  return (
    <section id="compare" className="scroll-mt-20 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionLabel>Честно про отличия</SectionLabel>
        <h2 className="font-display mt-2 max-w-[22ch] text-3xl font-semibold tracking-tight md:text-4xl">
          «Это же можно спросить у ChatGPT»
        </h2>
        <p className="mt-3 max-w-[46ch] text-[1.05rem] leading-7 text-muted-foreground">
          Можно. Только промпт не читал твой профиль, не слушал твои залетевшие
          ролики и не помнит, что ты уже снимал на прошлой неделе.
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card/60">
          <div className="hidden grid-cols-[1.1fr_1fr_1fr_1.3fr] gap-4 border-b border-border/70 px-5 py-4 text-[12px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span />
            <span>Промпт в ChatGPT</span>
            <span>Копия чужого рилса</span>
            <span className="text-primary">ReelsFactory</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.q}
              className="grid gap-3 border-b border-border/70 px-5 py-5 last:border-0 md:grid-cols-[1.1fr_1fr_1fr_1.3fr] md:items-start md:gap-4"
            >
              <p className="font-display text-[15px] font-semibold">{row.q}</p>
              <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <Minus className="mt-1 size-3.5 shrink-0" />
                <span>
                  <span className="md:hidden">ChatGPT: </span>
                  {row.chat}
                </span>
              </p>
              <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <Minus className="mt-1 size-3.5 shrink-0" />
                <span>
                  <span className="md:hidden">Копия чужого рилса: </span>
                  {row.copy}
                </span>
              </p>
              <p className="flex items-start gap-2 text-sm font-medium leading-6 text-foreground">
                <Check className="mt-1 size-3.5 shrink-0 text-primary" />
                <span>
                  <span className="text-primary md:hidden">ReelsFactory: </span>
                  {row.rf}
                </span>
              </p>
            </div>
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
    <section
      id="pricing"
      className="scroll-mt-20 border-t border-border/70 bg-card/30 px-5 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionLabel>Цены без мелкого шрифта</SectionLabel>
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
                    ? "border-primary bg-primary/10 shadow-[0_24px_60px_-30px_hsl(12_86%_56%/0.55)]"
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
                    <li key={p} className="flex items-start gap-2">
                      <Check className="mt-1 size-3.5 shrink-0 text-primary" />
                      {p}
                    </li>
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
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionLabel>Для кого</SectionLabel>
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

function Faq() {
  const items = [
    {
      q: "Чем это отличается от промпта в ChatGPT?",
      a: "Мы читаем твой профиль, забираем залетевшие ролики и расшифровываем их речь. Дальше сценарий строится на твоих же формулировках и держит жёсткий каркас хук → проблема → демо → CTA.",
    },
    {
      q: "Надо снимать внутри приложения?",
      a: "Нет. Снимаешь родной камерой телефона, а суфлёр держишь на экране: скорость, пауза и зеркальный режим — чтобы читать с руки или со штатива.",
    },
    {
      q: "Сколько ждать разбор?",
      a: "Обычно 1–2 минуты: разбор профиля, стратегия и сценарии приходят в приложение, можно закрыть и вернуться.",
    },
    {
      q: "Какие площадки поддерживаете?",
      a: "Разбираем Instagram и TikTok. Пакет собираем сразу под Reels, VK Клипы и Telegram — с разными обложками и подписями.",
    },
    {
      q: "А если ролик не залетел?",
      a: "В Студии есть разбор «почему не залетело» и ремейк: берём чужой вирус или свой провал и пересобираем структуру под твой аккаунт.",
    },
    {
      q: "Как оплатить и можно ли вернуть?",
      a: "Оплата картой РФ через YooKassa, условия — в оферте. Реферальным балансом можно закрыть часть или всю подписку.",
    },
  ];
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-t border-border/70 bg-card/30 px-5 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-3xl">
        <SectionLabel>Вопросы</SectionLabel>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Что обычно спрашивают
        </h2>
        <div className="mt-10 divide-y divide-border/70 border-y border-border/70">
          {items.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-display text-[17px] font-semibold tracking-tight">
                  {item.q}
                </span>
                <span className="relative size-4 shrink-0 text-primary">
                  <span className="absolute left-0 top-1/2 h-[1.5px] w-4 -translate-y-1/2 bg-current" />
                  <span className="absolute left-1/2 top-0 h-4 w-[1.5px] -translate-x-1/2 bg-current transition group-open:scale-y-0" />
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] text-[15px] leading-6 text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Offer() {
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-primary/30 bg-primary/10 p-6 md:p-10">
        <SectionLabel>Оффер</SectionLabel>
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
    <footer className="border-t border-border/70 bg-card/40 px-5 pb-28 pt-10 md:px-8 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <p className="font-display text-lg font-semibold">
              Reels<span className="text-primary">Factory</span>
            </p>
          </div>
          <a
            href={TG_HREF}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Открыть в Telegram
          </a>
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

function MobileCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">Разбор + 1 сценарий</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Бесплатно, без карты
          </p>
        </div>
        <Button asChild className="rf-cta h-11 shrink-0 px-5">
          <Link href={APP_HREF}>Начать</Link>
        </Button>
      </div>
    </div>
  );
}
