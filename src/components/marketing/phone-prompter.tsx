import { Pause, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

export type PrompterLine = { clock: string; text: string };

/**
 * Витринная копия экрана «Суфлёр»: та же тёмная сцена, линия чтения и скорости,
 * что и в Mini App, но текст едет по CSS-анимации — без состояния и JS.
 */
export function PhonePrompter({
  title,
  lines,
  className,
}: {
  title: string;
  lines: PrompterLine[];
  className?: string;
}) {
  const loop = [...lines, ...lines];

  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full max-w-[340px] rounded-[2.75rem] bg-ink p-2.5",
        "shadow-[0_2px_0_rgba(255,255,255,0.14)_inset,0_40px_90px_-30px_rgba(26,20,16,0.65)]",
        className,
      )}
    >
      <div className="relative flex size-full flex-col overflow-hidden rounded-[2.15rem] bg-[#0C0A09] text-[#F6F0E8]">
        <div className="absolute left-1/2 top-2.5 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black/70" />

        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-11">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Суфлёр
            </p>
            <p className="mt-1 truncate text-[11px] text-white/65">{title}</p>
          </div>
          <span className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary">
            15 сек
          </span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden px-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-[#0C0A09] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-[#0C0A09] to-transparent" />
          <div className="pointer-events-none absolute inset-x-3 top-[36%] z-20 h-px bg-primary/70" />

          <div className="animate-prompter-scroll will-change-transform">
            {loop.map((line, index) => (
              <p
                key={`${line.clock}-${index}`}
                className="pb-7 text-center first:pt-16"
              >
                <span className="mb-1.5 block text-[10px] font-medium tracking-[0.18em] text-white/35">
                  {line.clock}
                </span>
                <span className="block text-[1.32rem] font-semibold leading-[1.2] tracking-tight">
                  {line.text}
                </span>
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 px-4 pb-6 pt-2">
          <div className="flex items-center justify-center gap-1.5">
            {["Медленнее", "Норма", "Быстрее"].map((speed) => (
              <span
                key={speed}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium",
                  speed === "Норма"
                    ? "bg-primary text-[#1A1410]"
                    : "bg-white/10 text-white/60",
                )}
              >
                {speed}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <span className="flex h-11 min-w-[128px] items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-[#1A1410]">
              <Pause className="size-4" /> Идёт
            </span>
            <span className="flex size-11 items-center justify-center rounded-full border border-white/15 text-white/70">
              <RotateCcw className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
