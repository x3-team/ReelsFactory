"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Реальные этапы пайплайна и ожидаемое время (сек) внутри этапа.
 * Шкала заполняется по статусу с сервера + плавный рост внутри этапа.
 */
const STEPS = [
  {
    key: "SCRAPING",
    label: "Сканируем профиль",
    detail: "Био и топ‑рилсы из Instagram",
    expectedSec: 40,
    range: [8, 62] as const,
  },
  {
    key: "TRANSCRIBING",
    label: "Собираем хуки",
    detail: "Цепляющие фразы из роликов",
    expectedSec: 5,
    range: [62, 74] as const,
  },
  {
    key: "GENERATING",
    label: "Пишем сценарии",
    detail: "Столпы, суфлёр и CTA",
    expectedSec: 20,
    range: [74, 97] as const,
  },
] as const;

function stepIndex(status?: string | null) {
  switch (status) {
    case "QUEUED":
    case "PENDING":
      return -1;
    case "SCRAPING":
      return 0;
    case "TRANSCRIBING":
      return 1;
    case "GENERATING":
      return 2;
    case "COMPLETED":
      return 3;
    default:
      return -1;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function percentForStatus(
  status: string | null | undefined,
  stageElapsedSec: number,
) {
  if (!status || status === "QUEUED" || status === "PENDING") {
    return clamp(2 + stageElapsedSec * 0.5, 2, 5);
  }
  if (status === "COMPLETED") return 100;
  if (status === "FAILED") return 100;

  const idx = stepIndex(status);
  if (idx < 0 || idx >= STEPS.length) return 5;

  const step = STEPS[idx as 0 | 1 | 2];
  const [from, to] = step.range;
  // Линейный рост по ожидаемому времени этапа — не «залипает» у потолка
  const t = Math.min(0.92, stageElapsedSec / Math.max(6, step.expectedSec));
  return Math.round(from + (to - from) * t);
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
  const stageStartedAt = useRef(Date.now());
  const lastStatus = useRef(status);
  const [displayPercent, setDisplayPercent] = useState(3);

  useEffect(() => {
    if (status !== lastStatus.current) {
      lastStatus.current = status;
      stageStartedAt.current = Date.now();
    }
  }, [status]);

  useEffect(() => {
    if (failedMessage) {
      setDisplayPercent(100);
      return;
    }
    const id = window.setInterval(() => {
      const stageSec = (Date.now() - stageStartedAt.current) / 1000;
      const target = percentForStatus(status, stageSec);
      setDisplayPercent((prev) => {
        // Плавное догоняние без рывков назад
        if (target < prev) return prev;
        return prev + Math.max(0.3, (target - prev) * 0.35);
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [status, failedMessage]);

  const percent = failedMessage
    ? 100
    : status === "COMPLETED"
      ? 100
      : Math.min(97, Math.round(displayPercent));

  const activeStep = STEPS[Math.max(0, Math.min(index, STEPS.length - 1))];

  return (
    <div className="rf-shell animate-rf-rise justify-center gap-6 p-4">
      <p className="text-center font-display text-lg font-semibold tracking-tight">
        Reels<span className="text-primary">Factory</span>
      </p>
      <div className="relative mx-auto flex size-32 items-center justify-center">
        <div className="absolute inset-0 animate-rf-pulse-soft rounded-full bg-primary/15" />
        <div className="absolute inset-3 rounded-full border border-primary/20 bg-card/80" />
        <div className="relative flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold tabular-nums tracking-tight">
            {percent}%
          </span>
          <Loader2 className="mt-1 size-4 animate-spin text-primary" />
        </div>
      </div>

      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Разбираем профиль
        </h1>
        <p className="text-sm text-muted-foreground">
          {failedMessage
            ? "Не удалось завершить анализ"
            : status === "COMPLETED"
              ? "Готово"
              : `${activeStep.label} · ${elapsedSec} сек`}
        </p>
      </div>

      <Progress value={percent} className="h-2.5" />

      <ul className="space-y-2">
        {STEPS.map((step, i) => {
          const state = failedMessage
            ? i === Math.max(0, index)
              ? "failed"
              : i < index
                ? "done"
                : "pending"
            : i < index
              ? "done"
              : i === index || (index < 0 && i === 0)
                ? "active"
                : "pending";

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
                state === "active" && "border-primary bg-primary/5",
                state === "done" && "border-border/70 bg-card/70 opacity-80",
                state === "pending" && "border-border/60 bg-card/50",
                state === "failed" && "border-destructive text-destructive",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  state === "active" && "bg-primary text-primary-foreground",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "pending" && "bg-muted text-muted-foreground",
                  state === "failed" &&
                    "bg-destructive text-destructive-foreground",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3" />
                ) : state === "active" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="text-[10px] font-medium">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {state === "failed" ? failedMessage : step.label}
                </span>
                {state !== "failed" && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {step.detail}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
