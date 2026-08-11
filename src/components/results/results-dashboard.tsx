"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Check,
  Clapperboard,
  Copy,
  History,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";

import { AgencyClientsPanel } from "@/components/agency/agency-clients-panel";
import { AgencyReportButton } from "@/components/agency/agency-report";
import { AppVersion } from "@/components/app/app-version";
import { PaywallDrawer } from "@/components/paywall/paywall-drawer";
import { ReferralShareBar } from "@/components/paywall/referral-share-bar";
import { TeleprompterMode } from "@/components/results/teleprompter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type AppAnalysis, type AppScript, type AppUser } from "@/lib/client-api";
import type { PlanId } from "@/lib/config";
import { PLANS } from "@/lib/config";
import { cn } from "@/lib/utils";

export function ResultsDashboard({
  user,
  analysis,
  referralUrl,
  clientAccounts = [],
  previousAnalysis,
  analyses,
  onSelectPlan,
  loadingPlan,
  onReanalyze,
  onAnalyzeClient,
  onBuyScriptPack,
  onLoadAnalysis,
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
  previousAnalysis?: {
    id: string;
    niche?: string | null;
    targetAudience?: string | null;
    contentPillars?: Array<{ title: string; description: string }> | null;
    profileAuditTips?: string[] | null;
    createdAt?: string;
  } | null;
  analyses?: Array<{
    id: string;
    socialHandle: string;
    platform: string;
    niche?: string | null;
    createdAt: string;
    status: string;
  }>;
  onSelectPlan: (
    plan: Exclude<PlanId, "FREE">,
    billingPeriod: import("@/lib/config").BillingPeriod,
  ) => Promise<void> | void;
  loadingPlan?: string | null;
  onReanalyze: () => void;
  onAnalyzeClient?: (clientAccountId: string) => void;
  onBuyScriptPack?: () => void;
  onLoadAnalysis?: (analysisId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(analysis.scripts[0]?.id);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    setSelectedId(analysis.scripts[0]?.id);
  }, [analysis.id, analysis.scripts]);

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

  const meta = (
    analysis as {
      rawProfileData?: {
        _meta?: {
          videoCount?: number;
          whisperCount?: number;
          lowVideoSignal?: boolean;
        };
        topVideos?: unknown[];
      };
    }
  ).rawProfileData;
  const whisperCount = meta?._meta?.whisperCount ?? 0;
  const videoCount = meta?._meta?.videoCount ?? meta?.topVideos?.length;
  const lowVideoSignal =
    Boolean(meta) &&
    (meta?._meta?.lowVideoSignal === true ||
      (typeof videoCount === "number" && videoCount < 3));

  const nicheChanged =
    previousAnalysis?.niche &&
    analysis.niche &&
    previousAnalysis.niche !== analysis.niche;
  const prevTip = previousAnalysis?.profileAuditTips?.[0];
  const currTip = tips[0];
  const tipChanged = Boolean(prevTip && currTip && prevTip !== currTip);
  const showDiff = Boolean(previousAnalysis && (nicheChanged || tipChanged));

  const pastAnalyses =
    analyses?.filter((a) => a.id !== analysis.id && a.status === "COMPLETED") ??
    [];

  function isLocked(script: AppScript) {
    return isFree && script.id !== freeScriptId;
  }

  function selectThemeOrScript(index: number) {
    const script = analysis.scripts[index];
    if (!script) return;
    if (isLocked(script)) {
      setPaywallOpen(true);
      return;
    }
    setSelectedId(script.id);
  }

  function formatDate(iso?: string) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
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
          {(whisperCount > 0 || lowVideoSignal) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {whisperCount > 0 ? (
                <Badge variant="secondary" className="rounded-lg font-normal">
                  Разобрали речь из {whisperCount} рилсов
                </Badge>
              ) : null}
              {lowVideoSignal ? (
                <Badge
                  variant="outline"
                  className="rounded-lg border-amber-500/40 bg-amber-500/10 font-normal text-amber-800 dark:text-amber-200"
                >
                  Мало рилсов в профиле — разбор опирается на bio/подписи
                </Badge>
              ) : null}
            </div>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-lg">
          {planLabel}
        </Badge>
      </header>

      {showDiff && (
        <section className="rounded-2xl border border-border/70 bg-secondary/40 px-3.5 py-3">
          <p className="rf-label mb-1.5">Что изменилось</p>
          <ul className="space-y-1.5 text-[13px] leading-5 text-foreground/85">
            {nicheChanged ? (
              <li>
                Ниша:{" "}
                <span className="text-muted-foreground line-through">
                  {previousAnalysis?.niche}
                </span>{" "}
                → <span className="font-medium">{analysis.niche}</span>
              </li>
            ) : null}
            {tipChanged ? (
              <li>
                Совет:{" "}
                <span className="text-muted-foreground">{prevTip}</span>
                {" → "}
                <span className="font-medium">{currTip}</span>
              </li>
            ) : null}
          </ul>
        </section>
      )}

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
                  <button
                    key={pillar.title}
                    type="button"
                    onClick={() => selectThemeOrScript(index)}
                    className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition hover:border-primary/40"
                  >
                    <p className="text-[13px] font-semibold leading-5 text-foreground">
                      Тема {index + 1} → сценарий {index + 1}
                    </p>
                    <p className="mt-1 text-[13px] font-medium leading-5 text-foreground/90">
                      {pillar.title}
                    </p>
                    {pillar.description ? (
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                        {pillar.description}
                      </p>
                    ) : null}
                  </button>
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
            const preview =
              locked && script.teleprompterScript
                ? script.teleprompterScript.slice(0, 80).trim() +
                  (script.teleprompterScript.length > 80 ? "…" : "")
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
                  {preview ? (
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground blur-[2.5px] select-none">
                      {preview}
                    </p>
                  ) : (
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
                    </p>
                  )}
                  {locked ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {script.format}
                      {badge ? ` · ${badge}` : ""} · нажми, чтобы открыть
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {selected && !isLocked(selected) && (
          <>
            <ScriptViewer
              script={selected}
              userId={user.id}
              isFreeGift={isFree && selected.id === freeScriptId}
              onOpenTeleprompter={() => setTeleprompterOpen(true)}
              onUnlock={() => setPaywallOpen(true)}
              lockedCount={lockedCount}
            />
            {isFree &&
              selected.id === freeScriptId &&
              lockedCount > 0 && (
                <div className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3.5">
                  <p className="text-[14px] leading-6 text-foreground/90">
                    Ещё {lockedCount} сценария уже готовы на эту неделю
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1"
                      onClick={() => setPaywallOpen(true)}
                    >
                      Открыть подпиской
                    </Button>
                    {onBuyScriptPack ? (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onBuyScriptPack}
                      >
                        Ещё 3 сценария · 390₽
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
          </>
        )}
      </section>

      {analyses && analyses.length > 1 && onLoadAnalysis && (
        <section className="rf-surface space-y-3 p-4">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">История</h2>
          </div>
          <ul className="space-y-2">
            {(pastAnalyses.length > 0 ? pastAnalyses : analyses)
              .filter((a) => a.id !== analysis.id)
              .slice(0, 8)
              .map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onLoadAnalysis(item.id)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">
                        @{item.socialHandle}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {item.platform}
                        </span>
                      </p>
                      {item.niche ? (
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                          {item.niche}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <ReferralShareBar referralUrl={referralUrl} />
        <div className="grid gap-2">
          {user.subscriptionPlan === "AGENCY" ? (
            <AgencyReportButton analysis={analysis} />
          ) : null}
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
        onBuyScriptPack={onBuyScriptPack}
        showScriptPack={isFree && lockedCount > 0}
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
  userId,
  isFreeGift,
  onOpenTeleprompter,
  onUnlock,
  lockedCount,
}: {
  script: AppScript;
  userId: string;
  isFreeGift?: boolean;
  onOpenTeleprompter: () => void;
  onUnlock: () => void;
  lockedCount: number;
}) {
  const initialHooks = Array.isArray(script.hookOptions) ? script.hookOptions : [];
  const [hooks, setHooks] = useState(initialHooks);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const tips = filmingTips(script.format, script.teleprompterScript);

  useEffect(() => {
    setHooks(Array.isArray(script.hookOptions) ? script.hookOptions : []);
    setRegenError(null);
  }, [script.id, script.hookOptions]);

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  async function regenerateHooks() {
    setRegenLoading(true);
    setRegenError(null);
    try {
      const data = await api<{ hookOptions: string[] }>(
        "/api/scripts/regenerate-hooks",
        {
          method: "POST",
          body: JSON.stringify({ userId, scriptId: script.id }),
        },
      );
      if (Array.isArray(data.hookOptions) && data.hookOptions.length > 0) {
        setHooks(data.hookOptions);
      }
    } catch (err) {
      setRegenError(
        err instanceof Error ? err.message : "Не удалось обновить хуки",
      );
    } finally {
      setRegenLoading(false);
    }
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
          <div className="flex items-center gap-1.5">
            {hooks[0] ? (
              <CopyBtn
                copyKey="hook-best"
                label="Хук"
                text={hooks[0]}
                className="h-8 px-2.5 text-xs"
              />
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              disabled={regenLoading}
              onClick={() => void regenerateHooks()}
            >
              <RefreshCw
                className={cn("size-3.5", regenLoading && "animate-spin")}
              />
              Ещё 3 хука
            </Button>
          </div>
        </div>
        {regenError ? (
          <p className="mb-2 text-[12px] text-destructive">{regenError}</p>
        ) : null}
        <ul className="space-y-2">
          {hooks.map((hook, i) => (
            <li key={`${i}-${hook}`}>
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
