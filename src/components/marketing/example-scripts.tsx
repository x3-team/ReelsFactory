"use client";

import { useState } from "react";

import { Section, SectionHeading } from "@/components/marketing/primitives";
import { cn } from "@/lib/utils";

type Sample = {
  duration: 15 | 30 | 45;
  format: string;
  title: string;
  hooks: string[];
  lines: Array<{ clock: string; text: string }>;
  caption: string;
  cta: string;
};

/** Реальная форма выдачи движка: три длины, разные темы, таймкоды, мягкий финал. */
const SAMPLES: Sample[] = [
  {
    duration: 15,
    format: "ошибка",
    title: "Зефир плывёт не из-за агара",
    hooks: [
      "Зефир плывёт? Агар тут ни при чём.",
      "Если не держит форму — смотри температуру.",
      "Одна цифра на термометре решает всё.",
    ],
    lines: [
      { clock: "0–3с", text: "Стоп. Зефир плывёт не потому что агар плохой." },
      {
        clock: "3–8с",
        text: "Проблема в сиропе: ниже ста десяти — масса не соберётся, хоть три пачки засыпь.",
      },
      {
        clock: "8–12с",
        text: "Демо: термометр в кадр. Сто десять. Держи. Потом взбивай.",
      },
      { clock: "12–15с", text: "Сохрани. Завтра снимешь без кома в миске." },
    ],
    caption:
      "Не вини агар. Сначала температура сиропа. Сохрани, чтобы не искать завтра.",
    cta: "Сохрани ролик",
  },
  {
    duration: 30,
    format: "процесс",
    title: "Как я взбиваю, чтобы не было комков",
    hooks: [
      "Комки в зефире — это не «руки кривые».",
      "Смотри, на какой секунде я останавливаю миксер.",
      "Три шага. Без магии и без «по вкусу».",
    ],
    lines: [
      { clock: "0–3с", text: "Комки появляются не в конце. Они уже в сиропе." },
      {
        clock: "3–16с",
        text: "Проблема: льёшь горячее в белок слишком быстро — белок сварится клочками.",
      },
      {
        clock: "16–24с",
        text: "Демо: тонкая струя, миксер не глушу, жду ленту. Вот она тянется — стоп.",
      },
      {
        clock: "24–30с",
        text: "Напиши «ЛЕНТА» — пришлю короткий чеклист по температуре.",
      },
    ],
    caption: "Струя, лента, стоп. Без «по вкусу». Коммент ЛЕНТА — чеклист.",
    cta: "Напиши «ЛЕНТА»",
  },
  {
    duration: 45,
    format: "миф",
    title: "Миф: домашний зефир всегда слаще покупного",
    hooks: [
      "Домашний зефир не обязан быть приторным.",
      "Сладко до тошноты — это не «так надо».",
      "Я убрала ложку сахара. Смотри, что стало с формой.",
    ],
    lines: [
      { clock: "0–3с", text: "Миф: домашний зефир обязан быть приторным." },
      {
        clock: "3–22с",
        text: "Проблема в том, что сахар держат «для формы», а потом удивляются, что никто не доедает.",
      },
      {
        clock: "22–38с",
        text: "Демо: убери одну ложку, добавь кислоту, проверь срез через сутки. Держит? Держит.",
      },
      {
        clock: "38–45с",
        text: "Если нужен чеклист — слово «СРЕЗ» в комментарии. Цену в каждый ролик не тащу.",
      },
    ],
    caption: "Сладко ≠ крепко. Слово СРЕЗ — чеклист.",
    cta: "Напиши «СРЕЗ»",
  },
];

export function ExampleScripts() {
  const [active, setActive] = useState<Sample["duration"]>(15);
  const sample = SAMPLES.find((item) => item.duration === active) ?? SAMPLES[0];

  return (
    <Section id="example" tone="cream">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow="Пример выдачи"
          title="Так выглядит один разбор"
          lead="Демо-профиль домашнего кондитера. Один разбор — три сценария на разные темы, а не один текст, растянутый на три длины."
        />
        <div
          role="tablist"
          aria-label="Длина сценария"
          className="flex shrink-0 gap-2"
        >
          {SAMPLES.map((item) => (
            <button
              key={item.duration}
              type="button"
              role="tab"
              aria-selected={item.duration === active}
              onClick={() => setActive(item.duration)}
              className={cn(
                "rounded-full border px-5 py-3 font-display text-[1rem] font-semibold transition-colors",
                item.duration === active
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/15 text-ink/60 hover:border-ink/40",
              )}
            >
              {item.duration} сек
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gap-6 rounded-[1.8rem] border border-ink/12 bg-white/60 p-7 lg:p-9">
          <div>
            <p className="type-eyebrow text-primary">
              Reels {sample.duration}с · {sample.format}
            </p>
            <h3 className="type-h3 font-display mt-3">{sample.title}</h3>
          </div>

          <div>
            <p className="text-[0.82rem] font-medium uppercase tracking-[0.14em] text-ink/40">
              Варианты хука
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sample.hooks.map((hook) => (
                <span
                  key={hook}
                  className="rounded-full bg-clay px-3.5 py-2 text-[0.9rem] leading-snug text-ink/80"
                >
                  {hook}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-ink/10 pt-5 text-[0.94rem] leading-relaxed text-ink/65">
            <p>
              <span className="text-ink/40">Подпись. </span>
              {sample.caption}
            </p>
            <p className="mt-2">
              <span className="text-ink/40">В конце. </span>
              {sample.cta}
            </p>
          </div>
        </div>

        <div className="rounded-[1.8rem] bg-ink p-7 text-cream lg:p-9">
          <div className="flex items-center justify-between gap-3">
            <p className="type-eyebrow text-signal">Текст суфлёра</p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[0.78rem] text-cream/60">
              {sample.duration} сек
            </span>
          </div>
          <ol className="mt-7 flex flex-col gap-6">
            {sample.lines.map((line) => (
              <li key={line.clock} className="flex flex-col gap-2">
                <span className="text-[0.75rem] font-medium tracking-[0.16em] text-cream/35">
                  {line.clock}
                </span>
                <span className="text-[1.16rem] font-semibold leading-snug tracking-[-0.02em] lg:text-[1.3rem]">
                  {line.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
