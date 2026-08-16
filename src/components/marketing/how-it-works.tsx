import { Section, SectionHeading } from "@/components/marketing/primitives";

const STEPS = [
  {
    n: "01",
    title: "Разбор профиля",
    time: "≈ 40 секунд",
    text: "Даёшь @username в Instagram или TikTok. Забираем открытые данные: био, топ-видео, подписи — и расшифровываем звук роликов.",
    bullets: ["Био и подписи", "Топ-видео по просмотрам", "Расшифровка речи"],
  },
  {
    n: "02",
    title: "Три сценария",
    time: "≈ 40 секунд",
    text: "Модель собирает 15, 30 и 45 секунд по одному каркасу: хук, проблема, демонстрация, спокойный призыв. С таймкодами по секундам.",
    bullets: [
      "Варианты хуков на выбор",
      "Таймкоды 0–3с, 3–8с…",
      "Разные темы, не пересказ одного",
    ],
  },
  {
    n: "03",
    title: "Съёмка с суфлёра",
    time: "сколько нужно",
    text: "Жмёшь «Снимать» — текст едет по экрану крупно, с линией чтения. Три скорости, пауза, начать сначала. Ставишь телефон и говоришь.",
    bullets: ["Крупный кегль", "Медленнее / норма / быстрее", "Прямо в Telegram"],
  },
];

export function HowItWorks() {
  return (
    <Section id="how" tone="cream" className="border-t border-ink/10">
      <SectionHeading
        eyebrow="Как это работает"
        title="От ника до текста в камеру — три шага"
        lead="Между «надо снимать» и «снимаю» обычно стоит пустой лист. Здесь его нет: к концу разбора у тебя уже готовый текст, который можно читать вслух."
      />

      <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-ink/12 bg-ink/12 md:grid-cols-3">
        {STEPS.map((step) => (
          <article
            key={step.n}
            className="flex flex-col gap-5 bg-cream p-7 lg:p-9"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[2.6rem] font-bold leading-none tracking-[-0.05em] text-primary">
                {step.n}
              </span>
              <span className="type-eyebrow text-ink/35">{step.time}</span>
            </div>
            <h3 className="type-h3 font-display">{step.title}</h3>
            <p className="text-[0.98rem] leading-relaxed text-ink/65">
              {step.text}
            </p>
            <ul className="mt-auto flex flex-col gap-2 border-t border-ink/10 pt-5">
              {step.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2.5 text-[0.9rem] text-ink/70"
                >
                  <span
                    className="mt-[0.42rem] size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
