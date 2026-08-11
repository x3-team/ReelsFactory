"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  Check,
  Clapperboard,
  Copy,
  Lock,
  Sparkles,
  Target,
} from "lucide-react";

import { AgencyClientsPanel } from "@/components/agency/agency-clients-panel";
import { AppVersion } from "@/components/app/app-version";
import { PaywallDrawer } from "@/components/paywall/paywall-drawer";
import { ReferralShareBar } from "@/components/paywall/referral-share-bar";
import { TeleprompterMode } from "@/components/results/teleprompter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppAnalysis, AppScript, AppUser } from "@/lib/client-api";
import type { PlanId } from "@/lib/config";
import { PLANS } from "@/lib/config";
import { cn } from "@/lib/utils";

export function ResultsDashboard({
  user,
  analysis,
  referralUrl,
  clientAccounts = [],
  onSelectPlan,
  loadingPlan,
  onReanalyze,
  onAnalyzeClient,
}: {
  user: AppUser;
  analysis: AppAnalysis;
  referralUrl: string;
  clientAccounts?: Array<{
    id: string;
    socialHandle: string;
    platform: string;
    label?: string | null;
  }>;
  onSelectPlan: (
    plan: Exclude<PlanId, "FREE">,
    billingPeriod: import("@/lib/config").BillingPeriod,
  ) => Promise<void> | void;
  loadingPlan?: string | null;
  onReanalyze: () => void;
  onAnalyzeClient?: (clientAccountId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(analysis.scripts[0]?.id);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const selected = useMemo(
    () => analysis.scripts.find((s) => s.id === selectedId) || analysis.scripts[0],
    [analysis.scripts, selectedId],
  );

  const tips = analysis.profileAuditTips || [];
  const pillars = analysis.contentPillars || [];
  const isFree = user.subscriptionPlan === "FREE";
  const planLabel = PLANS[user.subscriptionPlan]?.name || user.subscriptionPlan;
  // Первый полный (или единственный) — бесплатный доступ, даже в старых записях с isTeaser=true
  const freeScriptId =
    analysis.scripts.find((s) => !s.isTeaser)?.id || analysis.scripts[0]?.id;
  const lockedCount = analysis.scripts.filter((s) => s.id !== freeScriptId).length;

  function isLocked(script: AppScript) {
    return isFree && script.id !== freeScriptId;
  }

  return (
    <div className="rf-shell animate-rf-rise gap-5 p-4 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight">
            Reels<span className="text-primary">Factory</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            @{analysis.socialHandle} · {analysis.platform}
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">
            Снимай это
          </h1>
          {analysis.niche && (
            <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
              {analysis.niche}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-lg">
          {planLabel}
        </Badge>
      </header>

      {user.subscriptionPlan === "AGENCY" && onAnalyzeClient && (
        <AgencyClientsPanel
          userId={user.id}
          initialAccounts={clientAccounts}
          onAnalyzeClient={onAnalyzeClient}
        />
      )}

      {/* Free value: audit upfront, not hidden */}
      {(analysis.targetAudience || tips.length > 0 || pillars.length > 0) && (
        <section className="rf-surface space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">
              Разбор профиля
            </h2>
          </div>
          {analysis.targetAudience && (
            <div>
              <p className="rf-label">Кому снимать</p>
              <p className="mt-1.5 text-[15px] leading-7 text-foreground/85">
                {analysis.targetAudience}
              </p>
            </div>
          )}
          {tips.length > 0 && (
            <div>
              <p className="rf-label mb-2">Что поправить</p>
              <ul className="space-y-2">
                {tips.slice(0, isFree ? 3 : tips.length).map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-[14px] leading-6 text-foreground"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pillars.length > 0 && (
            <div>
              <p className="rf-label mb-2">Темы на неделю · 3 под сценарии</p>
              <div className="space-y-2">
                {pillars.slice(0, 3).map((pillar, index) => (
                  <div
                    key={pillar.title}
                    className="rounded-xl border border-border/60 bg-card px-3 py-2.5"
                  >
                    <p className="text-[13px] font-semibold leading-5 text-foreground">
                      {index + 1}. {pillar.title}
                    </p>
                    {pillar.description ? (
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                        {pillar.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Сценарии
          </h2>
          <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
            {isFree
              ? `1 полный бесплатно${lockedCount ? ` · ещё ${lockedCount} под замком` : ""}`
              : "Выбери ролик и открой суфлёр"}
          </p>
        </div>

        {isFree && lockedCount > 0 && (
          <Button
            className="rf-cta-pulse w-full"
            onClick={() => setPaywallOpen(true)}
          >
            <Lock className="size-4" />
            Открыть все · ещё {lockedCount}
          </Button>
        )}

        <div className="space-y-2">
          {analysis.scripts.map((script, index) => {
            const locked = isLocked(script);
            const active = selected?.id === script.id;
            const badge = locked
              ? "PRO"
              : script.id === freeScriptId && isFree
                ? "твой"
                : null;
            return (
              <button
                key={script.id}
                type="button"
                onClick={() => {
                  if (locked) {
                    setPaywallOpen(true);
                    return;
                  }
                  setSelectedId(script.id);
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                  active && !locked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/80 bg-card",
                  locked && "opacity-95",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold tabular-nums",
                    active && !locked
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-[15px] font-semibold leading-5",
                        active && !locked
                          ? "text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {script.title}
                    </p>
                    {locked ? (
                      <Lock className="mt-0.5 size-4 shrink-0 opacity-80" />
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[12px] leading-4",
                      active && !locked
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {script.format}
                    {badge ? ` · ${badge}` : ""}
                    {locked ? " · нажми, чтобы открыть" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {selected && !isLocked(selected) && (
          <ScriptViewer
            script={selected}
            isFreeGift={isFree && selected.id === freeScriptId}
            onOpenTeleprompter={() => setTeleprompterOpen(true)}
            onUnlock={() => setPaywallOpen(true)}
            lockedCount={lockedCount}
          />
        )}
      </section>

      <div className="space-y-3">
        <ReferralShareBar referralUrl={referralUrl} />
        <div className="grid gap-2">
          <Button variant="outline" onClick={() => setPaywallOpen(true)}>
            Тарифы
          </Button>
          <Button variant="ghost" onClick={onReanalyze}>
            Новый анализ
          </Button>
        </div>
        <p className="pb-1 text-center text-[11px]">
          <AppVersion className="text-muted-foreground/80" />
        </p>
      </div>

      {teleprompterOpen && selected && !isLocked(selected) && (
        <TeleprompterMode
          title={selected.title}
          script={selected.teleprompterScript}
          onClose={() => setTeleprompterOpen(false)}
        />
      )}

      <PaywallDrawer
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        referralUrl={referralUrl}
        referralBalance={user.referralBalance || 0}
        currentPlan={user.subscriptionPlan}
        onSelectPlan={onSelectPlan}
        loadingPlan={loadingPlan}
      />
    </div>
  );
}

function filmingTips(format: string, script: string): string[] {
  const tips = [
    "Первый кадр — крупно в камеру, без «привет»",
    "Текст на экране дублирует хук из первых 3 секунд",
  ];
  if (/15/.test(format) || script.includes("15")) {
    tips.push("Держи темп: одна мысль — один жест");
  } else if (/45|30/.test(format)) {
    tips.push("Покажи процесс в кадре, не только говори");
  } else {
    tips.push("Покажи результат/деталь сразу после хука");
  }
  tips.push("В финале пауза 1 сек перед призывом");
  return tips;
}

function ScriptViewer({
  script,
  isFreeGift,
  onOpenTeleprompter,
  onUnlock,
  lockedCount,
}: {
  script: AppScript;
  isFreeGift?: boolean;
  onOpenTeleprompter: () => void;
  onUnlock: () => void;
  lockedCount: number;
}) {
  const hooks = Array.isArray(script.hookOptions) ? script.hookOptions : [];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const tips = filmingTips(script.format, script.teleprompterScript);

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  function CopyBtn({
    copyKey,
    label,
    text,
    className,
  }: {
    copyKey: string;
    label: string;
    text: string;
    className?: string;
  }) {
    const done = copiedKey === copyKey;
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        onClick={() => void copyText(copyKey, text)}
      >
        {done ? (
          <>
            <Check className="size-3.5" /> Скопировано
          </>
        ) : (
          <>
            <Copy className="size-3.5" /> {label}
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="rf-surface space-y-4 p-4">
      {isFreeGift && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/8 px-3 py-2.5 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold">Твой бесплатный сценарий</span>
            {" — "}
            полный суфлёр, хуки и текст поста. Можно снимать уже сейчас.
          </p>
        </div>
      )}

      <div>
        <h3 className="font-display text-xl font-semibold leading-snug tracking-tight">
          {script.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{script.format}</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="rf-label">Выбери хук (0–3 сек)</p>
          {hooks[0] ? (
            <CopyBtn
              copyKey="hook-best"
              label="Хук"
              text={hooks[0]}
              className="h-8 px-2.5 text-xs"
            />
          ) : null}
        </div>
        <ul className="space-y-2">
          {hooks.map((hook, i) => (
            <li key={hook}>
              <button
                type="button"
                onClick={() => void copyText(`hook-${i}`, hook)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-left text-[14px] leading-6 transition",
                  i === 0
                    ? "border border-primary/30 bg-primary/5 font-medium"
                    : "border border-border/60 bg-card",
                )}
              >
                {i === 0 && (
                  <span className="mb-1 flex items-center justify-between gap-2 text-[12px] font-medium text-primary">
                    Рекомендуем
                    <span className="font-normal text-muted-foreground">
                      {copiedKey === `hook-${i}` ? "Скопировано" : "Нажми — скопировать"}
                    </span>
                  </span>
                )}
                {i > 0 && (
                  <span className="mb-1 block text-[11px] text-muted-foreground">
                    {copiedKey === `hook-${i}` ? "Скопировано" : "Нажми — скопировать"}
                  </span>
                )}
                {hook}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="rf-label mb-2 flex items-center gap-1.5">
          <Camera className="size-3.5" /> Как снимать
        </p>
        <ul className="space-y-2">
          {tips.map((tip) => (
            <li
              key={tip}
              className="flex gap-2 text-[14px] leading-6 text-foreground/90"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="rf-label">Текст сценария</p>
          <CopyBtn
            copyKey="script"
            label="Сценарий"
            text={script.teleprompterScript}
            className="h-8 px-2.5 text-xs"
          />
        </div>
        <pre className="whitespace-pre-wrap rounded-xl border border-border/60 bg-card p-3 text-[14px] leading-7 text-foreground">
          {script.teleprompterScript}
        </pre>
      </div>

      <div className="space-y-2 rounded-xl bg-secondary/60 p-3 text-sm">
        <p>
          <span className="font-semibold">Призыв:</span> {script.cta}
        </p>
        <p className="text-muted-foreground">{script.caption}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <CopyBtn
            copyKey="caption"
            label="Текст поста"
            text={[script.caption, script.cta].filter(Boolean).join("\n\n")}
          />
          <CopyBtn
            copyKey="all"
            label="Всё целиком"
            text={[
              script.title,
              "",
              "Хуки:",
              ...hooks.map((h, i) => `${i + 1}. ${h}`),
              "",
              "Сценарий:",
              script.teleprompterScript,
              "",
              "Пост:",
              script.caption,
              script.cta,
            ]
              .filter((line) => line !== undefined)
              .join("\n")}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Button size="lg" onClick={onOpenTeleprompter}>
          <Clapperboard className="size-4" />
          Режим суфлёра
        </Button>
        {isFreeGift && lockedCount > 0 && (
          <Button
            size="lg"
            variant="secondary"
            className="rf-cta-pulse border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
            onClick={onUnlock}
          >
            <Lock className="size-4" />
            Открыть ещё {lockedCount} сценария
          </Button>
        )}
      </div>
    </div>
  );
}
