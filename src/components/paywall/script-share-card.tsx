"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { telegramShareUrl } from "@/lib/config";
import type { AppScript } from "@/lib/client-api";

export function ScriptShareCard({
  script,
  referralUrl,
  handle,
}: {
  script: AppScript;
  referralUrl: string;
  handle?: string;
}) {
  const [copied, setCopied] = useState(false);
  const hook = Array.isArray(script.hookOptions) ? script.hookOptions[0] : "";

  const shareText = [
    `Сценарий «${script.title}»`,
    handle ? `для @${handle}` : null,
    hook ? `Хук: ${hook}` : null,
    script.commentKeyword
      ? `CTA: комментируй «${script.commentKeyword}»`
      : script.cta,
    "",
    "Собрать свои сценарии в ReelsFactory:",
    referralUrl,
  ]
    .filter(Boolean)
    .join("\n");

  async function copy() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const shareHref = telegramShareUrl(referralUrl, shareText.slice(0, 200));

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-transparent">
      <div className="space-y-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Карточка для сторис
        </p>
        <p className="font-display text-base font-semibold leading-snug">
          {script.title}
        </p>
        {hook ? (
          <p className="text-sm text-muted-foreground">«{hook}»</p>
        ) : null}
        {handle ? (
          <p className="text-xs text-muted-foreground">@{handle}</p>
        ) : null}
      </div>
      <div className="flex gap-2 border-t border-border/60 bg-background/40 p-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => void copy()}
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Готово
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Копировать
            </>
          )}
        </Button>
        <Button type="button" size="sm" className="flex-1" asChild>
          <a href={shareHref} target="_blank" rel="noreferrer">
            <Share2 className="size-3.5" /> В Telegram
          </a>
        </Button>
      </div>
    </div>
  );
}
