import type { Metadata } from "next";
import Link from "next/link";

import { legalEntity } from "@/lib/legal";
import { PLANS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Публичная оферта — ReelsFactory",
};

export default function OfferPage() {
  const legal = legalEntity();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-10 pb-16">
      <Link href="/" className="text-sm font-medium text-primary">
        ← ReelsFactory
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight">
        Публичная оферта
      </h1>
      <div className="mt-8 space-y-4 text-[15px] leading-7 text-foreground/90 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        <p>
          Настоящий документ является официальным предложением (
          {legal.name}, ИНН {legal.inn}) заключить договор на использование
          сервиса {legal.brand} на условиях ниже.
        </p>
        <h2>1. Предмет оферты</h2>
        <p>
          Исполнитель предоставляет доступ к функционалу анализа публичных
          профилей и генерации сценариев коротких видео (включая суфлёр) через
          веб-интерфейс и/или Telegram Mini App.
        </p>
        <h2>2. Акцепт</h2>
        <p>
          Оплатой тарифа, началом использования платных функций или иным
          действием, указанным в интерфейсе как подтверждение, вы акцептуете
          оферту.
        </p>
        <h2>3. Стоимость</h2>
        <ul>
          <li>
            {PLANS.START.name}: {PLANS.START.priceRub} ₽ / мес —{" "}
            {PLANS.START.description}
          </li>
          <li>
            {PLANS.PRO.name}: {PLANS.PRO.priceRub} ₽ / мес — {PLANS.PRO.description}
          </li>
          <li>
            {PLANS.AGENCY.name}: {PLANS.AGENCY.priceRub} ₽ / мес —{" "}
            {PLANS.AGENCY.description}
          </li>
        </ul>
        <p>
          Годовая оплата может предоставляться на условиях «2 месяца в подарок»
          (оплата за 10 месяцев). Актуальные цены всегда отображаются в
          интерфейсе оплаты.
        </p>
        <h2>4. Порядок оказания</h2>
        <p>
          Услуга считается оказанной в момент предоставления доступа к
          результатам генерации / платным функциям в аккаунте пользователя.
        </p>
        <h2>5. Возвраты</h2>
        <p>
          Если сервис оказался технически недоступен по вине Исполнителя и это
          невозможно устранить, возможен возврат неиспользованной части оплаты
          по обращению на {legal.email}. Субъективная оценка качества сценариев
          сама по себе не является основанием для возврата.
        </p>
        <h2>6. Реквизиты</h2>
        <p>
          {legal.name}
          <br />
          ИНН: {legal.inn}
          {legal.ogrnip ? (
            <>
              <br />
              ОГРНИП: {legal.ogrnip}
            </>
          ) : null}
          <br />
          Адрес: {legal.address}
          <br />
          Email: {legal.email}
        </p>
      </div>
    </main>
  );
}
