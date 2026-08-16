"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { telegramShareUrl } from "@/lib/config";

export function ReferralShareBar({ referralUrl }: { referralUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const shareHref = telegramShareUrl(
    referralUrl,
    "Вставил профиль — получил текст в камеру. ReelsFactory",
  );

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border bg-secondary/50 p-3">
      <p className="w-full text-xs text-muted-foreground">
        Кинь другу: 30% с первой оплаты, 10% с продления
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        onClick={() => void copy()}
      >
        {copied ? (
          <>
            <Check className="size-3.5" /> Скопировано
          </>
        ) : (
          <>
            <Copy className="size-3.5" /> Ссылка
          </>
        )}
      </Button>
      <Button type="button" size="sm" className="rounded-full" asChild>
        <a href={shareHref} target="_blank" rel="noreferrer">
          <Share2 className="size-3.5" /> В Telegram
        </a>
      </Button>
    </div>
  );
}
