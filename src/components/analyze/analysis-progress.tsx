"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "scan", label: "Сканируем био…" },
  { key: "transcribe", label: "Расшифровываем топ‑видео…" },
  { key: "pillars", label: "Собираем контент‑столпы…" },
] as const;

export function AnalysisProgress({
  active = true,
  failedMessage,
}: {
  active?: boolean;
  failedMessage?: string | null;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || failedMessage) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % STEPS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [active, failedMessage]);

  const progress = failedMessage ? 100 : Math.min(92, (index + 1) * 30);

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
          Достаём хуки из топ‑видео и собираем сценарии.
        </p>
      </div>

      <Progress value={progress} />

      <ul className="space-y-3">
        {STEPS.map((step, i) => {
          const state =
            failedMessage && i === STEPS.length - 1
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
