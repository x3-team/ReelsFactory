import { Wordmark } from "@/components/marketing/site-header";
import { botUsername } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-cream px-5 py-12 text-ink sm:px-8">
      <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[38ch]">
            <Wordmark className="text-ink" />
            <p className="mt-3 text-[0.92rem] leading-relaxed text-ink/55">
              Разбор твоего профиля в Instagram и TikTok, три сценария на 15, 30
              и 45 секунд и суфлёр, с которого их можно читать в камеру.
            </p>
          </div>

          <nav className="flex flex-col gap-2.5 text-[0.92rem] text-ink/60">
            <a href="#how" className="hover:text-ink">
              Как работает
            </a>
            <a href="#example" className="hover:text-ink">
              Пример разбора
            </a>
            <a href="#pricing" className="hover:text-ink">
              Тарифы и реферал
            </a>
            <a href={`https://t.me/${botUsername()}`} className="hover:text-ink">
              Бот в Telegram
            </a>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-ink/10 pt-6 text-[0.82rem] text-ink/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ReelsFactory</p>
          <p>Работаем с открытыми данными профилей. Цены в рублях.</p>
        </div>
      </div>
    </footer>
  );
}
