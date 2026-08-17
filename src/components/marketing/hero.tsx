import { HandleForm } from "@/components/marketing/handle-form";
import { PhonePrompter } from "@/components/marketing/phone-prompter";
import { LiveDot, Pill } from "@/components/marketing/primitives";

const PROMPTER_LINES = [
  { clock: "0–3с", text: "Стоп. Зефир плывёт не потому что агар плохой." },
  {
    clock: "3–8с",
    text: "Проблема в сиропе: ниже ста десяти масса не соберётся.",
  },
  { clock: "8–12с", text: "Термометр в кадр. Сто десять. Держи." },
  { clock: "12–15с", text: "Сохрани. Завтра снимешь без кома в миске." },
];

const FACTS = [
  { value: "15 / 30 / 45", label: "секунд — три готовые длины" },
  { value: "1–2 мин", label: "от ника до текста в камеру" },
  { value: "IG + TikTok", label: "открытые профили, без YouTube" },
  { value: "0 ₽", label: "первый разбор и один суфлёр" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream px-5 pb-16 pt-12 text-ink sm:px-8 lg:pb-24 lg:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-52 size-[38rem] rounded-full bg-[radial-gradient(circle,_hsl(var(--primary)/0.18),_transparent_62%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-52 top-64 size-[34rem] rounded-full bg-[radial-gradient(circle,_hsl(var(--sand)/0.65),_transparent_65%)]"
      />

      <div className="relative mx-auto grid w-full max-w-[1160px] items-center gap-14 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.72fr)]">
        <div className="flex flex-col items-start gap-7">
          <Pill>
            <LiveDot />
            Telegram Mini App · Instagram и TikTok
          </Pill>

          <h1 className="type-hero font-display">
            <span className="block">Вставил</span>
            <span className="block">профиль —</span>
            <span className="block">
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">текст</span>
                <span
                  aria-hidden
                  className="absolute inset-x-[-0.08em] bottom-[0.1em] z-0 h-[0.28em] rounded-full bg-primary/25"
                />
              </span>{" "}
              в камеру
            </span>
          </h1>

          <p className="type-lead max-w-[54ch] text-ink/70">
            ReelsFactory разбирает твои же рилсы: био, подписи и расшифровку
            топ-видео. И отдаёт три сценария — 15, 30 и 45 секунд. Их не надо
            переписывать: включаешь суфлёр и читаешь с экрана.
          </p>

          <HandleForm />

          <p className="max-w-[46ch] text-[0.92rem] leading-relaxed text-ink/50">
            Первый разбор и один полный суфлёр — бесплатно, карта не нужна.
            Дальше — 590 ₽ в месяц.
          </p>

        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div
            aria-hidden
            className="absolute inset-x-8 bottom-6 top-10 rounded-[3rem] bg-clay/70"
          />
          <div className="relative">
            <PhonePrompter
              title="Зефир плывёт не из-за агара"
              lines={PROMPTER_LINES}
              className="max-w-[302px]"
            />

            <div className="absolute -left-[9.5rem] top-14 hidden w-[184px] rounded-2xl border border-ink/10 bg-cream px-4 py-3 shadow-[0_18px_40px_-24px_rgba(26,20,16,0.55)] sm:block">
              <p className="type-eyebrow text-ink/40">Твой хук</p>
              <p className="mt-1.5 text-[0.9rem] font-semibold leading-snug">
                «Агар тут ни при чём»
              </p>
            </div>

            <div className="absolute -bottom-10 -right-4 hidden w-[188px] rounded-2xl border border-ink/10 bg-ink px-4 py-3 text-cream shadow-[0_18px_40px_-24px_rgba(26,20,16,0.7)] sm:block">
              <p className="type-eyebrow text-signal">Каркас</p>
              <p className="mt-1.5 text-[0.86rem] font-medium leading-snug">
                хук → проблема → демо → CTA
              </p>
            </div>
          </div>
        </div>
      </div>

      <dl className="relative mx-auto mt-16 grid w-full max-w-[1160px] grid-cols-2 gap-x-6 gap-y-6 border-t border-ink/10 pt-8 sm:grid-cols-4 lg:mt-20">
        {FACTS.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-1.5">
            <dt className="font-display text-[1.28rem] font-bold tracking-[-0.03em]">
              {fact.value}
            </dt>
            <dd className="text-[0.82rem] leading-snug text-ink/50">
              {fact.label}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
