"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Clapperboard, Lock } from "lucide-react";

import { AgencyClientsPanel } from "@/components/agency/agency-clients-panel";
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
  onSelectPlan: (plan: Exclude<PlanId, "FREE">) => Promise<void> | void;
  loadingPlan?: string | null;
  onReanalyze: () => void;
  onAnalyzeClient?: (clientAccountId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(analysis.scripts[0]?.id);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const selected = useMemo(
    () => analysis.scripts.find((s) => s.id === selectedId) || analysis.scripts[0],
    [analysis.scripts, selectedId],
  );

  const tips = analysis.profileAuditTips || [];
  const pillars = analysis.contentPillars || [];
  const isFree = user.subscriptionPlan === "FREE";
  const planLabel = PLANS[user.subscriptionPlan]?.name || user.subscriptionPlan;

  return (
    <div className="rf-shell animate-rf-rise gap-5 p-4 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight">
            Reels<span className="text-primary">Factory</span>
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            @{analysis.socialHandle} · {analysis.platform}
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">
            Снимай это
          </h1>
          {analysis.niche && (
            <p className="mt-1 text-sm text-muted-foreground">{analysis.niche}</p>
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

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Сценарии
            </h2>
            <p className="text-xs text-muted-foreground">
              Выбери ролик и открой суфлёр
            </p>
          </div>
          {isFree && (
            <Button size="sm" variant="outline" onClick={() => setPaywallOpen(true)}>
              <Lock className="size-3.5" /> Все
            </Button>
          )}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {analysis.scripts.map((script, index) => (
            <button
              key={script.id}
              type="button"
              onClick={() => setSelectedId(script.id)}
              className={cn(
                "min-w-[11rem] rounded-2xl border px-3 py-3 text-left transition",
                selected?.id === script.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/80 bg-card/90",
              )}
            >
              <div
                className={cn(
                  "mb-1 text-[11px] uppercase tracking-wide",
                  selected?.id === script.id
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {index + 1}
                {script.isTeaser ? " · тизер" : ""}
              </div>
              <div className="line-clamp-2 text-sm font-semibold leading-snug">
                {script.title}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <ScriptViewer
            script={selected}
            lockedTeleprompter={isFree && selected.isTeaser}
            onOpenTeleprompter={() => {
              if (isFree && selected.isTeaser) {
                setPaywallOpen(true);
                return;
              }
              setTeleprompterOpen(true);
            }}
            onUnlock={() => setPaywallOpen(true)}
          />
        )}
      </section>

      <section className="rf-surface overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setAuditOpen((v) => !v)}
        >
          <div>
            <p className="text-sm font-semibold">Аудит профиля</p>
            <p className="text-xs text-muted-foreground">
              Аудитория, советы и столпы контента
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition",
              auditOpen && "rotate-180",
            )}
          />
        </button>
        {auditOpen && (
          <div className="space-y-4 border-t border-border/70 px-4 py-4">
            {analysis.targetAudience && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Кому снимать
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  {analysis.targetAudience}
                </p>
              </div>
            )}
            {tips.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Советы
                </p>
                <ul className="mt-2 space-y-2">
                  {tips.map((tip) => (
                    <li
                      key={tip}
                      className="rounded-xl bg-secondary/70 px-3 py-2 text-sm leading-relaxed"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pillars.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Столпы
                </p>
                <div className="mt-2 space-y-2">
                  {pillars.map((pillar) => (
                    <div key={pillar.title} className="rounded-xl bg-secondary/70 px-3 py-2">
                      <p className="text-sm font-semibold">{pillar.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {pillar.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
      </div>

      {teleprompterOpen && selected && (
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

function ScriptViewer({
  script,
  lockedTeleprompter,
  onOpenTeleprompter,
  onUnlock,
}: {
  script: AppScript;
  lockedTeleprompter: boolean;
  onOpenTeleprompter: () => void;
  onUnlock: () => void;
}) {
  const hooks = Array.isArray(script.hookOptions) ? script.hookOptions : [];

  return (
    <div className="rf-surface space-y-4 p-4">
      <div>
        <h3 className="font-display text-xl font-semibold leading-snug tracking-tight">
          {script.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{script.format}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Цепляющие фразы
        </p>
        <ul className="space-y-2">
          {hooks.map((hook) => (
            <li
              key={hook}
              className="rounded-xl bg-secondary/80 px-3 py-2.5 text-sm leading-snug"
            >
              {hook}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Текст для суфлёра
        </p>
        <pre className="whitespace-pre-wrap rounded-xl bg-foreground/[0.03] p-3 text-sm leading-relaxed">
          {script.teleprompterScript}
        </pre>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-semibold">Призыв:</span> {script.cta}
        </p>
        <p className="text-muted-foreground">{script.caption}</p>
      </div>

      <div className="grid gap-2">
        <Button size="lg" onClick={onOpenTeleprompter}>
          <Clapperboard className="size-4" />
          {lockedTeleprompter ? "Открыть суфлёр" : "Режим суфлёра"}
        </Button>
        {lockedTeleprompter && (
          <Button variant="outline" onClick={onUnlock}>
            <Lock className="size-4" /> Смотреть все сценарии
          </Button>
        )}
      </div>
    </div>
  );
}
