"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPEEDS = [
  { id: "slow", label: "Медленно", ms: 120 },
  { id: "normal", label: "Норм", ms: 70 },
  { id: "fast", label: "Быстро", ms: 40 },
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
  const [playing, setPlaying] = useState(true);
  const [offset, setOffset] = useState(0);
  const [speedId, setSpeedId] =
    useState<(typeof SPEEDS)[number]["id"]>("normal");
  const speed = SPEEDS.find((s) => s.id === speedId) || SPEEDS[1];

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setOffset((v) => v + 1);
    }, speed.ms);
    return () => window.clearInterval(id);
  }, [playing, speed.ms]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#07080c] text-white">
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            Суфлёр · снимай
          </p>
          <h2 className="font-display mt-1 truncate text-base font-semibold">
            {title}
          </h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#07080c] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[#07080c] to-transparent" />
        <div className="pointer-events-none absolute inset-x-6 top-[42%] z-10 h-px bg-primary/70" />
        <div
          className="whitespace-pre-wrap text-center font-display text-[1.85rem] font-semibold leading-[1.35] tracking-tight transition-transform"
          style={{ transform: `translateY(${120 - offset}px)` }}
        >
          {script}
        </div>
      </div>

      <div className="space-y-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex gap-2">
          {SPEEDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSpeedId(item.id)}
              className={cn(
                "flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition",
                speedId === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/15 bg-white/5 text-white/80",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            className="min-w-36 bg-white text-black hover:bg-white/90"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? (
              <>
                <Pause className="size-4" /> Пауза
              </>
            ) : (
              <>
                <Play className="size-4" /> Старт
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => {
              setOffset(0);
              setPlaying(true);
            }}
          >
            <RotateCcw className="size-4" />
            Сначала
          </Button>
        </div>
      </div>
    </div>
  );
}
