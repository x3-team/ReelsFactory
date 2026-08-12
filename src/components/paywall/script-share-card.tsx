"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { telegramShareUrl } from "@/lib/config";
import type { AppScript } from "@/lib/client-api";

/** Share script card + referral — virality under each scenario */
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
    <div className="space-y-2 rounded-xl border bg-secondary/40 p-3">
      <p className="text-xs font-medium">Карточка для шаринга</p>
      <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-background/80 p-2 text-xs leading-relaxed text-muted-foreground">
        {shareText}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? (
            <>
              <Check className="size-3.5" /> Скопировано
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Копировать карточку
            </>
          )}
        </Button>
        <Button type="button" size="sm" asChild>
          <a href={shareHref} target="_blank" rel="noreferrer">
            <Share2 className="size-3.5" /> В Telegram
          </a>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Рефералка: 30% с первой оплаты, 10% с продлений
      </p>
    </div>
  );
}
