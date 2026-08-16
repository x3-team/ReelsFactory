"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import {
  detectPlatform,
  normalizeHandle,
  YOUTUBE_UNSUPPORTED_MESSAGE,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

/** Поле «@username» с витрины: уводит в Mini App с уже подставленным профилем. */
export function HandleForm({
  tone = "ink",
  buttonLabel = "Разобрать профиль",
  className,
}: {
  tone?: "ink" | "cream";
  buttonLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const raw = value.trim();
    if (!raw) {
      setPending(true);
      router.push("/app");
      return;
    }
    if (detectPlatform(raw) === "youtube") {
      setError(YOUTUBE_UNSUPPORTED_MESSAGE);
      return;
    }
    const handle = normalizeHandle(raw, detectPlatform(raw));
    setError(null);
    setPending(true);
    router.push(`/app?handle=${encodeURIComponent(handle)}`);
  }

  const onCream = tone === "cream";

  return (
    <form onSubmit={submit} className={cn("w-full max-w-[560px]", className)}>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-[1.9rem] border p-2 sm:flex-row sm:items-center sm:rounded-full",
          onCream
            ? "border-cream/20 bg-cream/10"
            : "border-ink/15 bg-white/70 shadow-[0_18px_40px_-28px_rgba(26,20,16,0.5)]",
        )}
      >
        <label className="flex min-w-0 flex-1 items-center gap-1 px-4 py-2">
          <span
            className={cn(
              "text-lg font-semibold",
              onCream ? "text-cream/45" : "text-ink/35",
            )}
          >
            @
          </span>
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder="username"
            aria-label="Ник в Instagram или TikTok"
            inputMode="text"
            autoComplete="off"
            className={cn(
              "w-full min-w-0 bg-transparent text-[1.02rem] outline-none",
              onCream
                ? "text-cream placeholder:text-cream/40"
                : "text-ink placeholder:text-ink/35",
            )}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[0.98rem] font-semibold transition-colors disabled:opacity-70",
            onCream
              ? "bg-cream text-ink hover:bg-cream/90"
              : "bg-ink text-cream hover:bg-ink/88",
          )}
        >
          {pending ? "Открываем…" : buttonLabel}
          <ArrowRight className="size-4" />
        </button>
      </div>
      {error ? (
        <p
          className={cn(
            "mt-3 px-2 text-sm",
            onCream ? "text-signal" : "text-primary",
          )}
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
