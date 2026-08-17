"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";

import {
  TELEPROMPTER_SPEEDS,
  clampRemainingSec,
  formatTeleprompterClock,
  reelDurationSec,
  teleprompterScrollPxPerSec,
  type TeleprompterSpeedId,
} from "@/lib/teleprompter/timing";
import { cn } from "@/lib/utils";

type Line = { clock: string | null; text: string };

function splitTeleprompter(script: string): Line[] {
  return script
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d[^:]*с):\s*(.+)$/i);
      if (match) return { clock: match[1], text: match[2] };
      return { clock: null, text: line };
    });
}

const START_OFFSET = 88;

export function TeleprompterMode({
  title,
  script,
  durationSec,
  visualCues,
  onClose,
  onMarkShot,
}: {
  title: string;
  script: string;
  durationSec: number;
  visualCues?: {
    start0_3s?: string;
    midAction?: string;
    finalCta?: string;
  } | null;
  onClose: (info: { started: boolean; markedShot?: boolean }) => void;
  onMarkShot?: () => void;
}) {
  const reelSec = reelDurationSec(durationSec);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [speedId, setSpeedId] = useState<TeleprompterSpeedId>("normal");
  const [showCues, setShowCues] = useState(false);
  const [offset, setOffset] = useState(START_OFFSET);
  const [remainingSec, setRemainingSec] = useState(reelSec);
  const frame = useRef<number>(0);
  const lastTs = useRef<number>(0);
  const elapsedMs = useRef<number>(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => splitTeleprompter(script), [script]);
  const spoken = lines.map((line) => line.text).join(" ").trim();
  const scrollFactor =
    TELEPROMPTER_SPEEDS.find((item) => item.id === speedId)?.scrollFactor ?? 1;

  function floorOffset() {
    const view = viewportRef.current?.clientHeight ?? 420;
    const last = contentRef.current?.querySelector(
      "[data-last-line]",
    ) as HTMLElement | null;
    const lastTop = last?.offsetTop ?? contentRef.current?.scrollHeight ?? 0;
    const readingY = view * 0.38;
    return Math.min(START_OFFSET, readingY - lastTop);
  }

  function resetClock() {
    elapsedMs.current = 0;
    lastTs.current = 0;
    setRemainingSec(reelSec);
    setOffset(START_OFFSET);
    setPlaying(false);
    setFinished(false);
  }

  useEffect(() => {
    setRemainingSec(reelSec);
    elapsedMs.current = 0;
  }, [reelSec]);

  useEffect(() => {
    if (!playing) {
      lastTs.current = 0;
      return;
    }
    let stopped = false;
    const tick = (ts: number) => {
      if (stopped) return;
      if (!lastTs.current) lastTs.current = ts;
      const delta = Math.min(0.05, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      elapsedMs.current += delta * 1000;
      const remaining = clampRemainingSec(elapsedMs.current, reelSec);
      setRemainingSec(remaining);
      if (remaining <= 0) {
        stopped = true;
        setPlaying(false);
        setFinished(true);
        setOffset(floorOffset());
        return;
      }
      const floor = floorOffset();
      const distance = Math.max(0, START_OFFSET - floor);
      const pxPerSec = teleprompterScrollPxPerSec({
        distancePx: distance,
        durationSec: reelSec,
        scrollFactor,
      });
      setOffset((value) => {
        const next = value - pxPerSec * delta;
        if (next <= floor) return floor;
        return next;
      });
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame.current);
    };
  }, [playing, scrollFactor, reelSec]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0C0A09] text-[#F6F0E8]">
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
            Суфлёр · {reelSec} сек
          </p>
          <h2 className="mt-1 truncate text-sm text-white/70">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {visualCues && (
            <button
              type="button"
              onClick={() => setShowCues((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                showCues ? "bg-[#E07A5F] text-white" : "bg-white/10 text-white/80 hover:bg-white/20",
              )}
            >
              Кадр
            </button>
          )}
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white"
            onClick={() => onClose({ started })}
            aria-label="Закрыть суфлёр"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <p
        className="shrink-0 px-5 pb-1 text-center font-display text-[2.6rem] font-bold tabular-nums tracking-tight text-[#E07A5F]"
        aria-live="polite"
      >
        {formatTeleprompterClock(remainingSec)}
      </p>

      {showCues && visualCues && (
        <div className="mx-5 mb-2 rounded-2xl border border-white/15 bg-white/5 p-3 text-xs text-white/80 backdrop-blur">
          <p className="font-semibold text-[#E07A5F]">Подсказки для камеры:</p>
          {visualCues.start0_3s && (
            <p className="mt-1"><span className="text-white/50">0–3с:</span> {visualCues.start0_3s}</p>
          )}
          {visualCues.midAction && (
            <p className="mt-0.5"><span className="text-white/50">Середина:</span> {visualCues.midAction}</p>
          )}
          {visualCues.finalCta && (
            <p className="mt-0.5"><span className="text-white/50">Финал:</span> {visualCues.finalCta}</p>
          )}
        </div>
      )}

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#0C0A09] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[#0C0A09] to-transparent" />
        <div className="pointer-events-none absolute inset-x-4 top-[36%] z-10 h-px bg-[#E07A5F]/70" />
        <div
          ref={contentRef}
          className="px-1 pb-24"
          style={{ transform: `translateY(${offset}px)` }}
        >
          {spoken ? (
            <div className="space-y-9">
              {lines.map((line, index) => (
                <p
                  key={`${line.clock}-${index}`}
                  data-last-line={index === lines.length - 1 ? "1" : undefined}
                  className="text-center"
                >
                  {line.clock ? (
                    <span className="mb-2 block text-[13px] font-medium tracking-[0.16em] text-white/35">
                      {line.clock}
                    </span>
                  ) : null}
                  <span className="block font-semibold leading-[1.22] tracking-tight text-[clamp(2.15rem,8.4vw,3.15rem)]">
                    {line.text}
                  </span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-center text-3xl font-semibold leading-snug">
              Текст суфлёра пустой. Закрой экран и запусти анализ ещё раз.
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-3 px-5 pb-7 pt-3">
        <div className="flex items-center justify-center gap-2">
          {TELEPROMPTER_SPEEDS.map((speed) => (
            <button
              key={speed.id}
              type="button"
              onClick={() => setSpeedId(speed.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                speedId === speed.id
                  ? "bg-[#E07A5F] text-[#1A1410]"
                  : "bg-white/10 text-white/70",
              )}
            >
              {speed.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="flex h-14 min-w-44 items-center justify-center gap-2 rounded-full bg-[#E07A5F] px-6 text-base font-semibold text-[#1A1410]"
            onClick={() => {
              setStarted(true);
              setPlaying((value) => !value);
            }}
          >
            {playing ? (
              <>
                <Pause className="size-5" /> Пауза
              </>
            ) : (
              <>
                <Play className="size-5" /> Старт
              </>
            )}
          </button>
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-full border border-white/15 text-white"
            onClick={resetClock}
            aria-label="Сначала"
          >
            <RotateCcw className="size-5" />
          </button>
        </div>
        {finished ? (
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center">
            <p className="text-sm text-white/85">Время вышло. Отметить ролик снятым?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-11 rounded-full bg-[#E07A5F] text-sm font-semibold text-[#1A1410]"
                onClick={() => {
                  onMarkShot?.();
                  onClose({ started: true, markedShot: true });
                }}
              >
                Снял
              </button>
              <button
                type="button"
                className="h-11 rounded-full border border-white/20 text-sm text-white/80"
                onClick={() => onClose({ started: true })}
              >
                Пока нет
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
