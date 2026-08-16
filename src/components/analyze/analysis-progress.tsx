"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    detail: "Забираем био и топ‑рилсы из Instagram",
    expectedSec: 35,
    range: [5, 40] as const,
  },
  {
    key: "TRANSCRIBING",
    label: "Разбираем рилсы",
    detail: "Слушаем аудио и вытаскиваем хуки",
    expectedSec: 45,
    range: [40, 75] as const,
  },
  {
    key: "GENERATING",
    label: "Пишем сценарии",
    detail: "Собираем столпы, хуки и суфлёр",
    expectedSec: 25,
    range: [75, 97] as const,
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

  const step = STEPS[idx];
  const [from, to] = step.range;
  // Асимптота к верхней границе этапа — не «прыгает» на 100% раньше времени
  const t = 1 - Math.exp(-stageElapsedSec / Math.max(8, step.expectedSec * 0.55));
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
  const [stageElapsed, setStageElapsed] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(3);

  useEffect(() => {
    if (status !== lastStatus.current) {
      lastStatus.current = status;
      stageStartedAt.current = Date.now();
      setStageElapsed(0);
    }
  }, [status]);

  useEffect(() => {
    if (failedMessage) {
      setDisplayPercent(100);
      return;
    }
    const id = window.setInterval(() => {
      const stageSec = (Date.now() - stageStartedAt.current) / 1000;
      setStageElapsed(stageSec);
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
  const etaSec = useMemo(() => {
    if (failedMessage || status === "COMPLETED") return 0;
    const remainingStages = STEPS.slice(Math.max(0, index));
    let left = 0;
    remainingStages.forEach((step, i) => {
      if (i === 0) {
        left += Math.max(5, step.expectedSec - stageElapsed);
      } else {
        left += step.expectedSec;
      }
    });
    return Math.round(left);
  }, [failedMessage, status, index, stageElapsed]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="relative mx-auto flex size-28 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        <div className="absolute inset-2 rounded-full bg-primary/10" />
        <div className="relative flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums tracking-tight">
            {percent}%
          </span>
          <Loader2 className="mt-1 size-4 animate-spin text-primary" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Анализируем профиль
        </h1>
        <p className="text-sm text-muted-foreground">
          {failedMessage
            ? "Не удалось завершить анализ"
            : status === "COMPLETED"
              ? "Готово"
              : `${activeStep.label} · обычно ещё ~${etaSec} сек`}
        </p>
        <p className="text-xs text-muted-foreground">
          Живой анализ Instagram / TikTok занимает 1–2 минуты. Прошло {elapsedSec}{" "}
          сек.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Этап {Math.max(1, Math.min(index + 1, STEPS.length))} из{" "}
            {STEPS.length}
          </span>
          <span className="tabular-nums font-medium text-foreground">
            {percent}%
          </span>
        </div>
        <Progress value={percent} />
      </div>

      <ul className="space-y-3">
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
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                state === "active" && "border-primary bg-primary/5",
                state === "done" && "opacity-80",
                state === "failed" && "border-destructive text-destructive",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  state === "active" && "bg-primary text-primary-foreground",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "pending" && "bg-muted text-muted-foreground",
                  state === "failed" && "bg-destructive text-destructive-foreground",
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
                <span className="block font-medium">
                  {state === "failed" ? failedMessage : step.label}
                </span>
                {state !== "failed" && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {step.detail}
                    {state === "active"
                      ? ` · ~${step.expectedSec} сек`
                      : state === "done"
                        ? " · готово"
                        : ""}
                  </span>
                )}
              </span>
              {state === "active" && (
                <span className="shrink-0 tabular-nums text-xs font-medium text-primary">
                  {percent}%
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
