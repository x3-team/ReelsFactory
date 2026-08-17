import { Section } from "@/components/marketing/primitives";

const NOT_PROMISED = [
  "Не обещаем миллион просмотров: за досмотр отвечает то, как ты говоришь в кадре.",
  "Не выдумываем факты за тебя — если в профиле мало речи и подписей, сценарии будут осторожнее.",
  "Не разбираем YouTube и закрытые аккаунты: берём только открытые Instagram и TikTok.",
  "Не собираем чужие отзывы в красивую стенку — проверить проще на своём профиле, бесплатно.",
];

export function Honesty() {
  return (
    <Section tone="cream" className="border-t border-ink/10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <h2 className="type-h2 font-display text-balance-ru max-w-[14ch]">
          Честно о том, чего тут нет
        </h2>
        <ul className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
          {NOT_PROMISED.map((item) => (
            <li
              key={item}
              className="py-5 text-[1.02rem] leading-relaxed text-ink/70"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
