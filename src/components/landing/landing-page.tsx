"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clapperboard,
  Gift,
  MessageCircle,
  Minus,
  Repeat2,
  ScanSearch,
  ScrollText,
  Share2,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { PLANS, YEARLY_BILLED_MONTHS } from "@/lib/config";
import { botUsername } from "@/lib/config";
import { legalEntity } from "@/lib/legal";

const APP_HREF = "/app";
const TG_HREF = `https://t.me/${botUsername()}`;
const SHOT_W = 780;
const SHOT_H = 1688;
/**
 * Product cards crop away the repeated app header. 48% lands the cut in the blank
 * band above the tab row (328–382px of the 1688px screenshot), so no line is halved.
 */
const TABS_CROP = "48%";

const NAV = [
  { href: "#how", label: "Как работает" },
  { href: "#tools", label: "Инструменты" },
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
      <Tools />
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
              <span className="hidden sm:inline">Разобрать мои ролики</span>
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
            Бесплатно: твои рилсы → 1 сценарий с суфлёром · 1–2 минуты
          </p>
          <h1 className="font-display max-w-[20ch] text-[2.35rem] font-semibold leading-[1.08] tracking-tight md:text-[3.4rem] md:leading-[1.06]">
            Сценарий с суфлёром из твоих рилсов
          </h1>
          <p className="max-w-[42ch] text-[1.08rem] leading-7 text-muted-foreground">
            Видно, какие ролики взяли. Текст в камеру — в том же сеансе. Оплата
            в рублях. Рост подписчиков не обещаем: это не ChatGPT «про типичный
            фитнес» и не фабрика роликов.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rf-cta h-12 px-6 text-base">
              <Link href={APP_HREF}>
                <Clapperboard className="size-4" />
                Разобрать мои ролики
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
        objectPosition="50% 0%"
        className="absolute left-0 top-14 w-[56%] -rotate-[9deg]"
      />
      <PhoneShot
        src="/landing/scripts.png"
        alt="Готовый сценарий с хуком и таймкодами"
        objectPosition="50% 0%"
        priority
        className="absolute right-0 top-0 z-10 w-[64%] rotate-[6deg]"
      />
      <p className="absolute -left-2 bottom-0 z-20 w-max rounded-full border border-white/10 bg-card/90 px-3.5 py-2 text-[12px] font-medium text-muted-foreground shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur">
        <span className="text-foreground">Хуки из твоих же роликов</span> ·
        суфлёр с таймкодами
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
        <ShotFade top={false} />
      </div>
    </div>
  );
}

/** Softens a crop edge. The top edge only needs it when the crop starts mid-screen. */
function ShotFade({ top = true }: { top?: boolean }) {
  return (
    <>
      {top ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background/85 to-transparent"
        />
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/95 to-transparent"
      />
    </>
  );
}

function ProofStrip() {
  const items = [
    "Видно, какие ролики взяли",
    "Суфлёр в том же сеансе",
    "ЮKassa, цены в рублях",
    "Без обещания подписчиков",
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
      t: "Кидаешь @ник и ссылки на свои рилсы",
      d: "Instagram или TikTok. Можно цифры из Insights. Без ссылок и без скрейпа не притворимся, что открыли аккаунт.",
    },
    {
      n: "02",
      t: "Видишь, какие ролики взяли",
      d: "Список конкретных ссылок, не «типичный фитнес». Сценарий собирается из этих подписей и речи.",
    },
    {
      n: "03",
      t: "Читаешь суфлёр в том же сеансе",
      d: "Хук → проблема → демо → CTA на 15 / 30 / 45 сек. Снимаешь родной камерой, суфлёр на втором экране.",
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

function Tools() {
  const tools = [
    {
      icon: ScanSearch,
      t: "Разбор именно этих роликов",
      d: "Список ссылок, которые разобрали. Не средний фитнес из ChatGPT. Если скрейпа нет — вы сами кидаете рилсы и Insights.",
    },
    {
      icon: ScrollText,
      t: "Сценарии с суфлёром",
      d: "Пустая клетка у Virale и retenza. Хук → проблема → демо → CTA на 15, 30 или 45 секунд — читаешь в том же сеансе.",
    },
    {
      icon: CalendarDays,
      t: "Съёмочный день и календарь",
      d: "Один образ, порядок дублей, план на 7 дней. Чтобы ролик вышел сегодня, а не «когда придёт идея».",
    },
    {
      icon: Share2,
      t: "Подписи под площадки",
      d: "Не кросспост и не обещание роста. Если уже снял — подпись под Reels, VK Клипы или Telegram рядом со сценарием.",
    },
    {
      icon: Repeat2,
      t: "Ремейк вирусного ролика",
      d: "Берём чужую структуру, которая уже собрала просмотры, и переносим на твой продукт. Меньше шансов уйти в ноль.",
    },
    {
      icon: TrendingUp,
      t: "Разбор «почему не залетело»",
      d: "Раскладываем провал на хук, темп и оффер. Следующий ролик выходит с исправленной первой фразой.",
    },
    {
      icon: MessageCircle,
      t: "Воронка: коммент → бот",
      d: "Зритель пишет слово под роликом, бот отдаёт гайд. Это воронка в заявку, не обещание подписчиков.",
    },
    {
      icon: Video,
      t: "Копилка хуков",
      d: "Отмечаешь «Залетело» — и мы запоминаем, какие заходы работают именно на твоей аудитории.",
    },
  ];

  return (
    <section
      id="tools"
      className="scroll-mt-20 border-t border-border/70 bg-card/30 px-5 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <SectionLabel>Инструменты</SectionLabel>
        <h2 className="font-display mt-2 max-w-[20ch] text-3xl font-semibold tracking-tight md:text-4xl">
          Ваши рилсы → сценарий → суфлёр
        </h2>
        <p className="mt-3 max-w-[48ch] text-[1.05rem] leading-7 text-muted-foreground">
          Это вся работа. Не фабрика AI-видео и не кросспост. Каждый инструмент
          нужен, чтобы снять свой ролик, а не чужой шаблон.
        </p>
        <div className="mt-10 grid gap-x-8 gap-y-8 md:grid-cols-2">
          {tools.map((tool) => (
            <div key={tool.t} className="flex gap-4">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <tool.icon className="size-4" />
              </span>
              <div>
                <p className="font-display text-[17px] font-semibold tracking-tight">
                  {tool.t}
                </p>
                <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">
                  {tool.d}
                </p>
              </div>
            </div>
          ))}
        </div>
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
    <section
      id="product"
      className="scroll-mt-20 border-t border-border/70 px-5 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionLabel>Как это выглядит внутри</SectionLabel>
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
                  style={{ objectPosition: `50% ${TABS_CROP}` }}
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
      q: "Откуда факты",
      chat: "Типичная ниша из промпта",
      copy: "Аккаунт (Meta API) или удержание ролика",
      rf: "Конкретные твои рилсы — видно, какие взяли",
    },
    {
      q: "Суфлёр",
      chat: "Нет, дальше CapCut",
      copy: "Нет",
      rf: "В том же сеансе, 15 / 30 / 45 сек",
    },
    {
      q: "Оплата",
      chat: "Подписка модели или бесплатно",
      copy: "Virale от $45 · retenza 590–2490 ₽",
      rf: "0 / 590 / 1990 / 4990 ₽, ЮKassa",
    },
    {
      q: "Чего нет в обещании",
      chat: "Выдаёт среднее за разбор",
      copy: "Знают аккаунт, но текст в камеру не держат",
      rf: "Не обещаем рост подписчиков и не кросспостим",
    },
  ];
  return (
    <section
      id="compare"
      className="scroll-mt-20 border-t border-border/70 bg-card/30 px-5 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <SectionLabel>Честно про отличия</SectionLabel>
        <h2 className="font-display mt-2 max-w-[22ch] text-3xl font-semibold tracking-tight md:text-4xl">
          «Это же можно спросить у ChatGPT»
        </h2>
        <p className="mt-3 max-w-[46ch] text-[1.05rem] leading-7 text-muted-foreground">
          Можно. Промпт не видел твои ссылки. Virale знает аккаунт через Meta
          API, retenza правит удержание — суфлёра в том же сеансе нет. Мы не
          лучше «вообще»: закрываем клетку «профиль → сценарий → суфлёр» за рубли.
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card/60">
          <div className="hidden grid-cols-[1.1fr_1fr_1fr_1.3fr] gap-4 border-b border-border/70 px-5 py-4 text-[12px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span />
            <span>ChatGPT / GigaChat + CapCut</span>
            <span>Virale / retenza</span>
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
                  <span className="md:hidden">ChatGPT + CapCut: </span>
                  {row.chat}
                </span>
              </p>
              <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <Minus className="mt-1 size-3.5 shrink-0" />
                <span>
                  <span className="md:hidden">Virale / retenza: </span>
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
      points: ["12 сценариев / мес", "4 анализа", "Суфлёр в сеансе", "Съёмочный день"],
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
      className="scroll-mt-20 border-t border-border/70 px-5 py-16 md:px-8 md:py-24"
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
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            Годовая оплата — за {YEARLY_BILLED_MONTHS} месяцев вместо 12: два
            месяца в подарок.
          </p>
          <p className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            Рефералка: 30% с первой оплаты друга, 10% с продлений — на баланс или
            в скидку тарифа.
          </p>
        </div>
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
        <SectionLabel>Для кого</SectionLabel>
        <h2 className="font-display mt-2 max-w-[24ch] text-3xl font-semibold tracking-tight md:text-4xl">
          Для кого это
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
      q: "Чем это отличается от ChatGPT или GigaChat?",
      a: "Промпт пишет «типичный фитнес». Мы показываем, какие именно твои рилсы взяли, и даём суфлёр в том же сеансе. Если скрейпа нет — вы сами кидаете ссылки и Insights. Иначе это снова ChatGPT.",
    },
    {
      q: "Это как Virale или retenza?",
      a: "Нет. У Virale/ChatPlace (Creator от $45) есть Meta API и знание аккаунта. У retenza (590–2490 ₽) — разбор удержания и правка сценария. Суфлёра в том же сеансе публично нет ни у них, ни у Telegram Mini App с этой работой.",
    },
    {
      q: "Вы обещаете рост подписчиков?",
      a: "Нет. Обещание — текст в камеру из твоих роликов. Подписчики зависят от съёмки, оффера и удачи площадки. Если кто-то гарантирует рост — это лозунг.",
    },
    {
      q: "Вы тихо скрейпите Instagram?",
      a: "Скрейп профиля по ToS серый. Запуск на тихом обходе не строим. Если нет ключа скрейпа — не скажем, что разобрали живой аккаунт. Безопасный путь: вы кидаете ссылки и Insights. Официальный OAuth — когда будет доступ.",
    },
    {
      q: "Надо снимать внутри приложения?",
      a: "Нет. Снимаешь родной камерой, суфлёр на экране: скорость, пауза, зеркало. Мы не фабрика AI-видео вроде Predis или REELY.",
    },
    {
      q: "Как оплатить?",
      a: "Картой РФ через ЮKassa, цены в рублях. Условия — в оферте. Реферальным балансом можно закрыть часть или всю подписку.",
    },
  ];
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-t border-border/70 px-5 py-16 md:px-8 md:py-24"
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
        <SectionLabel>С чего начать</SectionLabel>
        <h2 className="font-display mt-2 max-w-[18ch] text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.08]">
          Посмотри, что у тебя уже работает
        </h2>
        <p className="mt-4 max-w-[42ch] text-[1.05rem] leading-7 text-muted-foreground">
          Бесплатно: ваши рилсы → 1 сценарий с суфлёром. Без карты. Понравится —
          Старт 590 ₽, чтобы снимать пачками. Рост подписчиков не обещаем.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="rf-cta h-12 px-6 text-base">
            <Link href={APP_HREF}>
              Разобрать мои ролики
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
        <p className="max-w-[46ch] text-sm leading-6 text-muted-foreground">
          Telegram Mini App для авторов СНГ: разбор твоих рилсов, сценарий и
          суфлёр в одном сеансе. Оплата в рублях. Не кросспост и не AI-видеофабрика.
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
