"use client";

import { Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "SCRAPING",
    label: "Сканируем профиль в Instagram…",
    hint: "Apify обычно 20–40 сек",
  },
  {
    key: "TRANSCRIBING",
    label: "Разбираем топ‑рилсы…",
    hint: "Whisper по видео — до минуты",
  },
  {
    key: "GENERATING",
    label: "Пишем сценарии и столпы…",
    hint: "gpt-4o-mini через AITunnel",
  },
] as const;

function stepIndex(status?: string | null) {
  switch (status) {
    case "QUEUED":
    case "PENDING":
    case "SCRAPING":
      return 0;
    case "TRANSCRIBING":
      return 1;
    case "GENERATING":
      return 2;
    case "COMPLETED":
      return 3;
    default:
      return 0;
  }
}

export function AnalysisProgress({
  status,
  failedMessage,
  elapsedSec = 0,
}: {
  status?: string | null;
  failedMessage?: string | null;
  elapsedSec?: number;
}) {
  const index = stepIndex(status);
  const progress = failedMessage
    ? 100
    : Math.min(95, 12 + index * 28 + Math.min(20, elapsedSec / 4));

  const activeHint =
    STEPS[Math.min(index, STEPS.length - 1)]?.hint ||
    "Обычно весь анализ занимает 1–2 минуты";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="relative mx-auto flex size-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-primary/15" />
        <Loader2 className="relative size-10 animate-spin text-primary" />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Анализируем профиль
        </h1>
        <p className="text-sm text-muted-foreground">
          {failedMessage
            ? "Не удалось завершить анализ"
            : `${activeHint}. Прошло ${elapsedSec} сек.`}
        </p>
      </div>

      <Progress value={progress} />

      <ul className="space-y-3">
        {STEPS.map((step, i) => {
          const state =
            failedMessage && i === Math.min(index, STEPS.length - 1)
              ? "failed"
              : i < index
                ? "done"
                : i === index
                  ? "active"
                  : "pending";
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                state === "active" && "border-primary bg-primary/5",
                state === "done" && "opacity-70",
                state === "failed" && "border-destructive text-destructive",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  state === "active" && "animate-pulse bg-primary",
                  state === "done" && "bg-primary",
                  state === "pending" && "bg-muted-foreground/40",
                  state === "failed" && "bg-destructive",
                )}
              />
              {state === "failed" ? failedMessage : step.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
