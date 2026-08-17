import { Check, Minus } from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/primitives";

const GENERIC = [
  "Спрашивает тему. О тебе не знает ничего",
  "Пишет текст для глаз: длинные фразы, которые вслух не выговорить",
  "Выдаёт двадцать идей — снять нельзя ни одну",
  "Тащит «личный бренд» и цену в каждый ролик",
];

const OURS = [
  "Начинает с твоих рилсов: био, подписи, расшифровка топ-видео",
  "Каждая строка — реплика: её можно произнести за один вдох",
  "Три готовых длины вместо списка идей",
  "Опирается на твои же слова, а оффер — максимум в одном сценарии из трёх",
];

export function Difference() {
  return (
    <Section tone="clay">
      <SectionHeading
        eyebrow="Чем это не является"
        title="Это не ещё один AI-писатель"
        lead="Разница простая: генератор текста придумывает за тебя, а ReelsFactory сначала слушает, что ты уже говоришь в кадре, и только потом пишет."
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.8rem] border border-ink/12 bg-cream/60 p-7 lg:p-9">
          <p className="type-eyebrow text-ink/40">Обычный генератор текста</p>
          <ul className="mt-6 flex flex-col gap-4">
            {GENERIC.map((item) => (
              <li key={item} className="flex items-start gap-3 text-ink/55">
                <Minus className="mt-1 size-4 shrink-0 text-ink/30" />
                <span className="text-[1rem] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1.8rem] border border-ink/15 bg-ink p-7 text-cream lg:p-9">
          <p className="type-eyebrow text-signal">ReelsFactory</p>
          <ul className="mt-6 flex flex-col gap-4">
            {OURS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check className="mt-1 size-4 shrink-0 text-signal" />
                <span className="text-[1rem] leading-relaxed text-cream/90">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
