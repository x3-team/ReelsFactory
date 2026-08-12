"use client";

import { useEffect, useState } from "react";
import { FlipHorizontal, Minus, Pause, Play, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPEEDS = [
  { id: "slow", label: "Медленно", px: 28 },
  { id: "mid", label: "Норма", px: 52 },
  { id: "fast", label: "Быстро", px: 86 },
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
  const [offset, setOffset] = useState(120);
  const [speedId, setSpeedId] = useState<(typeof SPEEDS)[number]["id"]>("mid");
  const [fontScale, setFontScale] = useState(1);
  const [mirror, setMirror] = useState(false);

  const speed = SPEEDS.find((s) => s.id === speedId)?.px ?? 52;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setOffset((v) => v + speed * dt);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing, speed]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
            Суфлёр
          </p>
          <h2 className="truncate font-display text-sm font-medium">{title}</h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-black to-transparent" />
        <div
          className="whitespace-pre-wrap text-center font-semibold leading-snug tracking-tight will-change-transform"
          style={{
            fontSize: `${1.65 * fontScale}rem`,
            transform: `translateY(${160 - offset}px) scaleX(${mirror ? -1 : 1})`,
          }}
        >
          {script}
        </div>
      </div>

      <div className="space-y-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex justify-center gap-1">
          {SPEEDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSpeedId(item.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                speedId === item.id ? "bg-primary text-white" : "bg-white/10",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button
            size="lg"
            className="min-w-36"
            onClick={() => setPlaying((p) => !p)}
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
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setFontScale((v) => Math.max(0.8, +(v - 0.15).toFixed(2)))}
            aria-label="Мельче"
          >
            <Minus className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setFontScale((v) => Math.min(1.45, +(v + 0.15).toFixed(2)))}
            aria-label="Крупнее"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="icon"
            variant={mirror ? "default" : "secondary"}
            onClick={() => setMirror((v) => !v)}
            aria-label="Зеркало"
          >
            <FlipHorizontal className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => {
              setOffset(120);
              setPlaying(true);
            }}
          >
            Сначала
          </Button>
        </div>
      </div>
    </div>
  );
}
