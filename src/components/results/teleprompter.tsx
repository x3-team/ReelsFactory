"use client";

import { useEffect, useState } from "react";
import { Pause, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setOffset((v) => v + 1);
    }, 80);
    return () => window.clearInterval(id);
  }, [playing]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">
            Teleprompter
          </p>
          <h2 className="text-sm font-medium">{title}</h2>
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

      <div className="relative flex-1 overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
        <div
          className="whitespace-pre-wrap text-center text-3xl font-semibold leading-relaxed tracking-tight transition-transform"
          style={{ transform: `translateY(${80 - offset}px)` }}
        >
          {script}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 p-6">
        <Button
          variant="secondary"
          className="min-w-40"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? (
            <>
              <Pause className="size-4" /> Pause
            </>
          ) : (
            <>
              <Play className="size-4" /> Play
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
          Restart
        </Button>
      </div>
    </div>
  );
}
