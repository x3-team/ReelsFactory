import { HandleForm } from "@/components/marketing/handle-form";
import { Section } from "@/components/marketing/primitives";
import { botUsername } from "@/lib/config";

export function FinalCta() {
  return (
    <Section tone="ink">
      <div className="flex flex-col items-start gap-8">
        <p className="type-eyebrow text-signal">Начать</p>
        <h2 className="type-hero font-display text-balance-ru max-w-[16ch]">
          Один ник — и текст в камеру
        </h2>
        <p className="type-lead max-w-[52ch] text-cream/65">
          Разбор профиля и первый суфлёр — бесплатно. Дальше решишь сам: если
          сценарии не звучат твоим голосом, платить не за что.
        </p>

        <HandleForm tone="cream" buttonLabel="Разобрать профиль" />

        <p className="text-[0.9rem] text-cream/45">
          Или открой бота в Telegram:{" "}
          <a
            href={`https://t.me/${botUsername()}`}
            className="text-cream underline underline-offset-4 hover:text-signal"
          >
            @{botUsername()}
          </a>
        </p>
      </div>
    </Section>
  );
}
