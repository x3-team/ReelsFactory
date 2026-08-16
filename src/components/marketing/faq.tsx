import { Plus } from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/primitives";

const ITEMS = [
  {
    q: "Нужен ли Telegram?",
    a: "Так удобнее: ReelsFactory — Mini App, разбор и суфлёр открываются прямо в мессенджере, отдельное приложение ставить не надо. Но всё то же самое работает и в браузере.",
  },
  {
    q: "А YouTube?",
    a: "Нет. Только Instagram и TikTok. Мы не угадываем площадку: у длинных роликов другая логика удержания, и честнее сказать «не берём», чем выдать текст наугад.",
  },
  {
    q: "Профиль должен быть открытым?",
    a: "Да. Мы читаем только то, что и так видно любому: био, публичные ролики, подписи и звук этих роликов. Пароли и доступы не нужны.",
  },
  {
    q: "Сколько ждать разбор?",
    a: "Обычно одну-две минуты: забрать топ-видео, расшифровать звук, собрать три сценария. Экран показывает, на каком шаге процесс.",
  },
  {
    q: "У меня маленький аккаунт, сработает?",
    a: "Да, но честно: чем меньше в профиле собственных текстов и речи, тем осторожнее будут сценарии. Мы опираемся на твои слова, а не придумываем биографию.",
  },
  {
    q: "Как отменить подписку?",
    a: "Оплата помесячная. Не продлеваешь — доступ просто заканчивается, разборы и сценарии остаются на месте.",
  },
];

export function Faq() {
  return (
    <Section id="faq" tone="cream" className="border-t border-ink/10">
      <SectionHeading eyebrow="Вопросы" title="Что обычно спрашивают" />

      <div className="mt-12 grid gap-x-12 lg:grid-cols-2">
        {ITEMS.map((item) => (
          <details
            key={item.q}
            className="group border-b border-ink/10 py-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[1.06rem] font-semibold">
              {item.q}
              <Plus className="mt-1 size-4 shrink-0 text-primary transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-3 max-w-[62ch] text-[0.98rem] leading-relaxed text-ink/65">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}
