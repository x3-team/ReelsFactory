"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Progress } from "@/components/ui/progress";
import { formatPlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "SCRAPING",
    label: "Сканируем профиль",
    linksLabel: "Читаем ваши ссылки",
    expectedSec: 35,
    range: [5, 40] as const,
  },
  {
    key: "TRANSCRIBING",
    label: "Разбираем ролики",
    linksLabel: "Собираем факты из подписей",
    expectedSec: 45,
    range: [40, 75] as const,
  },
  {
    key: "GENERATING",
    label: "Пишем сценарии",
    linksLabel: "Пишем сценарии и суфлёр",
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
  const step = STEPS.find((_, i) => i === idx);
  if (!step) return 5;

  const [from, to] = step.range;
  const t = 1 - Math.exp(-stageElapsedSec / Math.max(8, step.expectedSec * 0.55));
  return Math.round(from + (to - from) * t);
}

function scrapeDetail(platform?: string | null, fromLinks?: boolean) {
  if (fromLinks) return "Только вставленные URL · аккаунт не открывали";
  const name = formatPlatform(platform);
  return `Био и топ‑видео · ${name}`;
}

export function AnalysisProgress({
  status,
  failedMessage,
  elapsedSec = 0,
  platform,
  fromLinks,
}: {
  status?: string | null;
  failedMessage?: string | null;
  elapsedSec?: number;
  platform?: string | null;
  fromLinks?: boolean;
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
  const etaLabel = useMemo(() => {
    if (failedMessage || status === "COMPLETED") return "";
    const remainingStages = STEPS.slice(Math.max(0, index));
    let left = 0;
    remainingStages.forEach((step, i) => {
      if (i === 0) {
        left += Math.max(5, step.expectedSec - stageElapsed);
      } else {
        left += step.expectedSec;
      }
    });
    if (left > 75) return "ещё около 1–2 минут";
    if (left > 40) return "ещё около минуты";
    return "почти готово";
  }, [failedMessage, status, index, stageElapsed]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size="lg" />
        <div className="text-center">
          <p className="font-display text-5xl font-semibold tabular-nums tracking-tight">
            {percent}%
          </p>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            {failedMessage
              ? "Не удалось завершить анализ"
              : status === "COMPLETED"
                ? "Готово"
                : `${fromLinks ? activeStep.linksLabel : activeStep.label} · ${etaLabel}`}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={percent} />
        <p className="text-center text-xs text-muted-foreground">
          Разбор занимает 1–2 минуты. Прошло {elapsedSec} сек.
        </p>
      </div>

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
          const detail =
            step.key === "SCRAPING"
              ? scrapeDetail(platform, fromLinks)
              : step.key === "TRANSCRIBING"
                ? fromLinks
                  ? "Подписи и цифры Insights, без Whisper"
                  : "Слушаем аудио и вытаскиваем хуки"
                : "Столпы, хуки и суфлёр";

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
                state === "active" && "border-primary/60 bg-primary/10",
                state === "done" && "opacity-70",
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
                <span className="block font-medium">
                  {state === "failed"
                    ? failedMessage
                    : fromLinks
                      ? step.linksLabel
                      : step.label}
                </span>
                {state !== "failed" && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {detail}
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
