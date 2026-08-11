"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { botUsername } from "@/lib/config";

const APP_HREF = "/app";
const TG_HREF = `https://t.me/${botUsername()}`;

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
    <div className="rf-landing min-h-dvh overflow-x-hidden text-foreground">
      {/* Hero — one composition: brand, headline, line, CTA, dominant visual */}
      <section className="relative isolate min-h-[100dvh] overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(90% 70% at 80% 10%, hsl(347 86% 48% / 0.22), transparent 50%), radial-gradient(70% 50% at 10% 90%, hsl(210 40% 40% / 0.18), transparent 45%), linear-gradient(165deg, #0c0e14 0%, #151925 48%, #1a1520 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-8">
          <header className="animate-rf-rise sticky top-0 z-20 -mx-5 mb-6 flex items-center justify-between bg-gradient-to-b from-[#0c0e14] via-[#0c0e14]/95 to-transparent px-5 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] md:-mx-8 md:px-8">
            <p className="font-display text-[1.65rem] font-semibold tracking-tight text-white md:text-3xl">
              Reels<span className="text-primary">Factory</span>
            </p>
            <Link
              href={APP_HREF}
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              Войти
            </Link>
          </header>

          <div className="relative grid flex-1 items-end gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-12">
            <div className="animate-rf-rise relative z-10 space-y-5 [animation-delay:80ms]">
              <h1 className="font-display max-w-[15ch] text-[2.2rem] font-semibold leading-[1.12] tracking-tight text-white md:text-5xl md:leading-[1.08]">
                Расти в Reels проще — без ступора «что снимать»
              </h1>
              <p className="max-w-[36ch] text-[1.05rem] leading-7 text-white/72">
                Разберём твой профиль и выдадим готовые сценарии с суфлёром —
                снимай сегодня и копи аудиторию быстрее.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="rf-cta-pulse h-12 px-6 text-base">
                  <Link href={APP_HREF}>
                    Начать бесплатно
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <a
                  href={TG_HREF}
                  className="text-center text-sm font-medium text-white/65 underline-offset-4 hover:text-white hover:underline sm:text-left"
                >
                  или открыть в Telegram
                </a>
              </div>
            </div>

            <div className="animate-rf-rise relative mx-auto w-full max-w-[240px] md:max-w-[320px] [animation-delay:160ms]">
              <PhoneDemo />
            </div>
          </div>
        </div>
      </section>

      {/* How it works — one job */}
      <section className="border-t border-border/60 bg-background px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Как это работает
          </h2>
          <p className="mt-3 max-w-[40ch] text-[1.05rem] leading-7 text-muted-foreground">
            Три шага — и ты уже в режиме съёмки.
          </p>
          <ol className="mt-10 space-y-8">
            {[
              {
                n: "01",
                t: "Кидаешь @ник",
                d: "Instagram, TikTok или YouTube — разберём то, что уже залетает.",
              },
              {
                n: "02",
                t: "AI читает сильные ролики",
                d: "Темы, хуки, тон. Не общие советы «из интернета» — под твой профиль.",
              },
              {
                n: "03",
                t: "Получаешь сценарии + суфлёр",
                d: "15 / 30 / 45 секунд. Открыл суфлёр — и снимаешь.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-border/70 pb-8 last:border-0 last:pb-0"
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

      {/* What you get */}
      <section className="border-t border-border/60 bg-[#0f1218] px-5 py-16 text-white md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Что получишь
          </h2>
          <p className="mt-3 max-w-[42ch] text-[1.05rem] leading-7 text-white/65">
            Не «идеи на листочке» — пакет под камеру.
          </p>
          <ul className="mt-10 space-y-5 text-[1.05rem] leading-7 text-white/88">
            {[
              "Разбор профиля: аудитория, что поправить, темы на неделю",
              "Готовые сценарии с таймкодами и 3 вариантами хука",
              "Суфлёр со скоростью — снимай без бумажки",
              "Текст поста и CTA — копируй и публикуй",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Killer offer */}
      <section className="border-t border-border/60 bg-background px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-[13px] font-medium text-primary">Оффер</p>
          <h2 className="font-display mt-2 max-w-[18ch] text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.08]">
            Бесплатно: разбор + 1 полный сценарий с суфлёром
          </h2>
          <p className="mt-4 max-w-[40ch] text-[1.05rem] leading-7 text-muted-foreground">
            Сегодня же можно снять первый ролик. Остальные сценарии откроются,
            когда будешь готов снимать пачками.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rf-cta-pulse h-12 px-6 text-base">
              <Link href={APP_HREF}>
                <Clapperboard className="size-4" />
                Разобрать мой профиль
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground sm:max-w-[22ch]">
              Без карты. Старт в Telegram Mini App — меньше минуты.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base font-semibold text-foreground">
            Reels<span className="text-primary">Factory</span>
          </p>
          <p>Сценарии под съёмку · РФ / СНГ</p>
        </div>
      </footer>
    </div>
  );
}

function PhoneDemo() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#07080c] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="text-[11px] font-medium text-white/45">Суфлёр</span>
          <span className="size-2 animate-rf-pulse-soft rounded-full bg-primary" />
        </div>
        <div className="relative h-[300px] overflow-hidden px-4 md:h-[420px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#07080c] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-[#07080c] to-transparent" />
          <div className="pointer-events-none absolute inset-x-5 top-[42%] z-10 h-px bg-primary/70" />
          <div className="rf-tele-scroll space-y-5 pt-16 text-center text-[1.35rem] font-medium leading-[1.45] text-white">
            <p>Как понять, что зефир удался — за 3 секунды?</p>
            <p>Не пробуй на вкус. Смотри на текстуру.</p>
            <p>Держи кусок на весу: если не тянется — готово.</p>
            <p>Сними крупно. Без «привет, друзья».</p>
            <p>В финале — мягкий CTA в комментарии.</p>
            <p>Как понять, что зефир удался — за 3 секунды?</p>
            <p>Не пробуй на вкус. Смотри на текстуру.</p>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-center text-[12px] text-white/50">
          Готовый текст · таймкоды · под твой тон
        </div>
      </div>
    </div>
  );
}
