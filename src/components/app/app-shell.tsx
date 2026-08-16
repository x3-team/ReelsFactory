"use client";

import { useTelegram } from "@/components/telegram/telegram-provider";
import { cn } from "@/lib/utils";

/** 9:16 колонка на вебе, на всю высоту в Telegram. Светлая витрина, не чёрный экран. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isTelegram } = useTelegram();

  return (
    <div
      className={cn(
        "min-h-dvh",
        isTelegram ? "bg-background" : "flex justify-center bg-[hsl(var(--linen))]",
      )}
    >
      <div
        className={cn(
          "relative flex min-h-dvh w-full flex-col bg-background",
          !isTelegram &&
            "max-w-[430px] shadow-[0_0_0_1px_rgba(26,20,16,0.06),0_28px_80px_rgba(26,20,16,0.12)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
