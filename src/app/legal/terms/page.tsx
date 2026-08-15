import type { Metadata } from "next";
import Link from "next/link";

import { legalEntity } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Пользовательское соглашение — ReelsFactory",
};

export default function TermsPage() {
  const legal = legalEntity();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-10 pb-16">
      <Link href="/" className="text-sm font-medium text-primary">
        ← ReelsFactory
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight">
        Пользовательское соглашение
      </h1>
      <div className="mt-8 space-y-4 text-[15px] leading-7 text-foreground/90 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        <p>
          Соглашение регулирует использование сервиса {legal.brand} (
          {legal.name}, ИНН {legal.inn}). Используя сайт {legal.siteUrl} или
          Telegram Mini App, вы принимаете условия.
        </p>
        <h2>1. Предмет</h2>
        <p>
          Сервис помогает анализировать публичные профили соцсетей и генерировать
          сценарии коротких видео, подсказки по съёмке и текст для суфлёра.
        </p>
        <h2>2. Аккаунт</h2>
        <p>
          Вход выполняется через Telegram. Вы отвечаете за достоверность
          указанных данных и законность использования чужих публичных профилей
          для анализа в рамках сервиса.
        </p>
        <h2>3. Тарифы и оплата</h2>
        <ul>
          <li>бесплатный доступ ограничен (разбор + часть сценариев);</li>
          <li>платные планы описаны в интерфейсе и публичной оферте;</li>
          <li>оплата через платёжного провайдера; возвраты — по оферте.</li>
        </ul>
        <h2>4. Контент и ИИ</h2>
        <p>
          Сценарии генерируются автоматически и носят рекомендательный характер.
          Вы самостоятельно проверяете факты, права на материалы и соответствие
          правилам площадок перед публикацией.
        </p>
        <h2>5. Ограничения</h2>
        <p>
          Запрещено использовать сервис для спама, мошенничества, нарушения прав
          третьих лиц и обхода технических ограничений.
        </p>
        <h2>6. Ответственность</h2>
        <p>
          Сервис предоставляется «как есть». Мы не гарантируем конкретный рост
          охватов или продаж. Максимальная ответственность ограничена суммой,
          уплаченной вами за последний расчётный период.
        </p>
        <h2>7. Контакты</h2>
        <p>
          {legal.name}
          <br />
          ИНН: {legal.inn}
          <br />
          Email: {legal.email}
        </p>
        <p>
          Также см.{" "}
          <Link href="/legal/offer" className="text-primary underline-offset-2 hover:underline">
            публичную оферту
          </Link>{" "}
          и{" "}
          <Link href="/legal/privacy" className="text-primary underline-offset-2 hover:underline">
            политику конфиденциальности
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
