import { Gauge, Smartphone, Type } from "lucide-react";

import { PhonePrompter } from "@/components/marketing/phone-prompter";
import { CtaLink, Section, SectionHeading } from "@/components/marketing/primitives";

const FEATURES = [
  {
    icon: Type,
    title: "Кегль, который видно с полутора метров",
    text: "Телефон стоит на штативе или кружке — строку всё равно читаешь без прищура.",
  },
  {
    icon: Gauge,
    title: "Три скорости и пауза",
    text: "Медленнее, норма, быстрее. Сбился — жмёшь «сначала» и переснимаешь дубль.",
  },
  {
    icon: Smartphone,
    title: "Открывается прямо в Telegram",
    text: "Суфлёр живёт в Mini App: не надо ставить отдельное приложение и заводить аккаунт.",
  },
];

const LINES = [
  { clock: "0–3с", text: "Хватит начинать с «привет, сегодня я расскажу»." },
  { clock: "3–8с", text: "Человек уже листнул, пока ты представляешься." },
  { clock: "8–12с", text: "Первая фраза — удар. Потом один факт." },
  { clock: "12–15с", text: "Сохрани. Завтра снимешь с этой фразы." },
];

export function PrompterSection() {
  return (
    <Section tone="ink">
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Суфлёр"
            tone="cream"
            title="Обещание простое: текст, который можно читать с экрана"
            lead="Сценарий бесполезен, если в кадре его приходится вспоминать. Поэтому выдача сразу открывается в режиме суфлёра — тем же экраном, с которого ты будешь снимать."
          />

          <ul className="flex flex-col divide-y divide-cream/12 border-y border-cream/12">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-5 py-6">
                <feature.icon className="mt-1 size-5 shrink-0 text-signal" />
                <div>
                  <p className="text-[1.05rem] font-semibold">{feature.title}</p>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-cream/60">
                    {feature.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <CtaLink href="/app" tone="cream" className="self-start">
            Попробовать суфлёр
          </CtaLink>
        </div>

        <div className="flex justify-center lg:justify-end">
          <PhonePrompter title="Ролик умирает на первой фразе" lines={LINES} />
        </div>
      </div>
    </Section>
  );
}
