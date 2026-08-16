"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";

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
const SPEEDS = [
  { id: "slow", label: "Медленнее", pxPerSec: 12 },
  { id: "normal", label: "Норма", pxPerSec: 20 },
  { id: "fast", label: "Быстрее", pxPerSec: 32 },
] as const;

export function TeleprompterMode({
  title,
  script,
  onClose,
}: {
  title: string;
  script: string;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speedId, setSpeedId] = useState<(typeof SPEEDS)[number]["id"]>("normal");
  const [offset, setOffset] = useState(START_OFFSET);
  const frame = useRef<number>(0);
  const lastTs = useRef<number>(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => splitTeleprompter(script), [script]);
  const spoken = lines.map((line) => line.text).join(" ").trim();
  const pxPerSec = SPEEDS.find((item) => item.id === speedId)?.pxPerSec ?? 20;

  function floorOffset() {
    const view = viewportRef.current?.clientHeight ?? 420;
    const last = contentRef.current?.querySelector(
      "[data-last-line]",
    ) as HTMLElement | null;
    const lastTop = last?.offsetTop ?? contentRef.current?.scrollHeight ?? 0;
    const readingY = view * 0.38;
    return Math.min(START_OFFSET, readingY - lastTop);
  }

  useEffect(() => {
    if (!playing) {
      lastTs.current = 0;
      return;
    }
    let stopped = false;
    const tick = (ts: number) => {
      if (stopped) return;
      if (!lastTs.current) lastTs.current = ts;
      const delta = (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      const floor = floorOffset();
      setOffset((value) => {
        const next = value - pxPerSec * delta;
        if (next <= floor) {
          stopped = true;
          setPlaying(false);
          return floor;
        }
        return next;
      });
      if (!stopped) {
        frame.current = window.requestAnimationFrame(tick);
      }
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame.current);
    };
  }, [playing, pxPerSec]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0C0A09] text-[#F6F0E8]">
      <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
            Суфлёр
          </p>
          <h2 className="mt-1 truncate text-sm text-white/70">{title}</h2>
        </div>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white"
          onClick={onClose}
          aria-label="Закрыть суфлёр"
        >
          <X className="size-5" />
        </button>
      </div>

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

      <div className="space-y-3 px-5 pb-7 pt-3">
        <div className="flex items-center justify-center gap-2">
          {SPEEDS.map((speed) => (
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
            onClick={() => setPlaying((value) => !value)}
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
            onClick={() => {
              setOffset(START_OFFSET);
              setPlaying(false);
            }}
            aria-label="Сначала"
          >
            <RotateCcw className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
