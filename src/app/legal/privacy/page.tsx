import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { legalEntity } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — ReelsFactory",
};

export default function PrivacyPage() {
  const legal = legalEntity();
  return (
    <LegalDoc title="Политика конфиденциальности">
      <p>
        Настоящая Политика описывает, как {legal.brand} ({legal.name}, ИНН{" "}
        {legal.inn}) обрабатывает персональные данные пользователей сервиса по
        адресу {legal.siteUrl} и в Telegram Mini App.
      </p>
      <h2>1. Какие данные мы получаем</h2>
      <ul>
        <li>данные Telegram-аккаунта (id, имя, username) при входе через бота;</li>
        <li>указанный вами @ник / ссылку на соцсеть и параметры онбординга;</li>
        <li>результаты анализа профиля и сгенерированные сценарии;</li>
        <li>платёжные метаданные от платёжного провайдера (без полных данных карты);</li>
        <li>технические логи (IP, устройство) для безопасности и отладки.</li>
      </ul>
      <h2>2. Цели обработки</h2>
      <ul>
        <li>оказание услуги: анализ профиля и генерация сценариев;</li>
        <li>оплата подписки и учёт реферальной программы;</li>
        <li>связь по вопросам поддержки;</li>
        <li>улучшение качества сервиса.</li>
      </ul>
      <h2>3. Правовые основания</h2>
      <p>
        Обработка ведётся на основании согласия пользователя, договора-оферты и
        требований законодательства РФ (в т.ч. 152-ФЗ).
      </p>
      <h2>4. Передача третьим лицам</h2>
      <p>
        Данные могут передаваться подрядчикам в объёме, необходимом для работы
        сервиса: хостинг, AI-провайдеры, скрапинг-провайдеры, платёжный провайдер
        (например, ЮKassa), мессенджер Telegram. Мы не продаём персональные данные.
      </p>
      <h2>5. Хранение и защита</h2>
      <p>
        Данные хранятся на защищённых серверах столько, сколько нужно для цели
        обработки и исполнения закона. Доступ ограничен уполномоченными лицами.
      </p>
      <h2>6. Ваши права</h2>
      <p>
        Вы можете запросить доступ, уточнение, удаление или отзыв согласия,
        написав на {legal.email}.
      </p>
      <h2>7. Контакты оператора</h2>
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
    </LegalDoc>
  );
}

function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-10 pb-16">
      <Link href="/" className="text-sm font-medium text-primary">
        ← ReelsFactory
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <div className="prose-legal mt-8 space-y-4 text-[15px] leading-7 text-foreground/90 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}
