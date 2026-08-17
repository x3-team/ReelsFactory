"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDERS = [
  "Что продаёте или чему учите? Например: семейная ипотека от 3,5% на новостройки СПб",
  "Какую ошибку чаще всего делает клиент? Например: смотрят только на цену метра, не на школы рядом",
  "Цифра, срок или приём, который можно сказать вслух. Например: первая очередь в 2028, марина на 1500 яхт",
];

export function FactsForm({
  handle,
  loading,
  error,
  onSubmit,
}: {
  handle?: string | null;
  loading?: boolean;
  error?: string | null;
  onSubmit: (facts: string[]) => Promise<void> | void;
}) {
  const [facts, setFacts] = useState(["", "", ""]);
  const [localError, setLocalError] = useState<string | null>(null);

  function update(index: number, value: string) {
    setFacts((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  async function submit() {
    setLocalError(null);
    const trimmed = facts.map((item) => item.replace(/\s+/g, " ").trim());
    if (trimmed.some((item) => item.length < 8)) {
      setLocalError("Каждый факт — минимум 8 символов. Без воды, как для камеры.");
      return;
    }
    await onSubmit(trimmed);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 p-5">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {handle ? `@${handle}` : "Профиль"}
        </p>
        <h1 className="font-display text-[1.85rem] font-semibold leading-tight">
          Подписей мало — не будем выдумывать
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Сценарий без фактуры врёт. Напишите 3 вещи из вашей работы — соберём
          суфлёр только из них.
        </p>
      </div>

      <div className="space-y-3">
        {PLACEHOLDERS.map((placeholder, index) => (
          <label key={placeholder} className="block space-y-1.5">
            <span className="text-sm font-medium">Факт {index + 1}</span>
            <Textarea
              value={facts[index]}
              placeholder={placeholder}
              rows={3}
              className="rounded-2xl"
              onChange={(event) => update(index, event.target.value)}
            />
          </label>
        ))}
      </div>

      {(localError || error) && (
        <p className="text-sm text-destructive">{localError || error}</p>
      )}

      <Button
        className="h-12 rounded-2xl text-base"
        disabled={loading}
        onClick={() => void submit()}
      >
        {loading ? "Собираем сценарии…" : "Собрать сценарии из фактов"}
      </Button>
    </div>
  );
}
