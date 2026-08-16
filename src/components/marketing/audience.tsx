import { Section, SectionHeading } from "@/components/marketing/primitives";

const CARDS = [
  {
    title: "Эксперту и блогеру",
    text: "Ты уже снимаешь, но каждый раз садишься писать текст заново. Здесь текст приходит из твоих же удачных роликов.",
    line: "Старт · 12 сценариев в месяц",
  },
  {
    title: "Мастеру и локальному бизнесу",
    text: "Кондитер, мастер маникюра, репетитор, студия. Снимать надо, копирайтера нет, а про свою работу ты и так всё знаешь — не хватает слов на камеру.",
    line: "Про · 30 сценариев в месяц",
  },
  {
    title: "SMM-щику и агентству",
    text: "Несколько клиентских аккаунтов, у каждого свой голос. Разборы и сценарии хранятся отдельно по аккаунтам.",
    line: "Агентство · до 5 клиентских аккаунтов",
  },
];

export function Audience() {
  return (
    <Section tone="cream" className="border-t border-ink/10">
      <SectionHeading
        eyebrow="Для кого"
        title="Для тех, кто снимает сам"
        lead="Не для отделов маркетинга с продакшеном. Для человека, который держит телефон в руках и говорит в камеру своим голосом."
      />

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {CARDS.map((card) => (
          <article
            key={card.title}
            className="flex flex-col gap-4 rounded-[1.8rem] border border-ink/12 bg-white/55 p-7 transition-colors hover:border-ink/30 lg:p-8"
          >
            <h3 className="type-h3 font-display">{card.title}</h3>
            <p className="text-[0.98rem] leading-relaxed text-ink/65">
              {card.text}
            </p>
            <p className="mt-auto pt-4 text-[0.86rem] font-medium text-primary">
              {card.line}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
