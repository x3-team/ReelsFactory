"use client";

import { useMemo, useState } from "react";
import { Lock, Video } from "lucide-react";

import { AgencyClientsPanel } from "@/components/agency/agency-clients-panel";
import { PaywallDrawer } from "@/components/paywall/paywall-drawer";
import { ReferralShareBar } from "@/components/paywall/referral-share-bar";
import { TeleprompterMode } from "@/components/results/teleprompter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppAnalysis, AppScript, AppUser } from "@/lib/client-api";
import type { PlanId } from "@/lib/config";
import { PLANS } from "@/lib/config";
import { scriptDuration } from "@/lib/script-meta";
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
  const selectedLocked = Boolean(isFree && selected?.isTeaser);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-5 pb-10">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            @{analysis.socialHandle} · {analysis.platform}
          </p>
          <h1 className="font-display mt-2 text-[1.85rem] font-semibold">
            Готово. Можно снимать.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Три длины — 15, 30 и 45 секунд. Жми «Снимать» и читай с экрана.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full">
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Сценарии</h2>
          {isFree && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setPaywallOpen(true)}
            >
              <Lock className="size-3.5" /> Открыть все
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {analysis.scripts.map((script, index) => {
            const duration = scriptDuration(script, index);
            const locked = isFree && script.isTeaser;
            return (
              <button
                key={script.id}
                type="button"
                onClick={() => setSelectedId(script.id)}
                className={cn(
                  "flex-1 rounded-2xl border px-3 py-3 text-left",
                  selected?.id === script.id
                    ? "border-primary bg-accent"
                    : "border-border bg-card",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-lg font-semibold tabular-nums">
                    {duration}
                  </span>
                  {locked ? <Lock className="size-3.5 text-muted-foreground" /> : null}
                </div>
                <div className="text-xs text-muted-foreground">сек</div>
              </button>
            );
          })}
        </div>

        {analysis.scripts.length === 0 && (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            Сценарии не сохранились. Запусти анализ ещё раз — суфлёр должен
            содержать каркас хук → проблема → демо → CTA.
          </div>
        )}

        {selected && (
          <ScriptCard
            script={selected}
            duration={scriptDuration(
              selected,
              analysis.scripts.findIndex((item) => item.id === selected.id),
            )}
            referralUrl={referralUrl}
            locked={selectedLocked}
            onShoot={() => {
              if (selectedLocked) {
                setPaywallOpen(true);
                return;
              }
              setTeleprompterOpen(true);
            }}
            onUnlock={() => setPaywallOpen(true)}
          />
        )}
      </section>

      <section className="space-y-2">
        <button
          type="button"
          className="w-full text-left text-sm font-medium text-muted-foreground"
          onClick={() => setAuditOpen((value) => !value)}
        >
          {auditOpen ? "Скрыть разбор профиля" : "Что увидели в профиле"}
        </button>
        {auditOpen && (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            {analysis.niche && (
              <p className="text-sm">
                <span className="text-muted-foreground">Ниша. </span>
                {analysis.niche}
              </p>
            )}
            {analysis.targetAudience && (
              <p className="text-sm">
                <span className="text-muted-foreground">Для кого. </span>
                {analysis.targetAudience}
              </p>
            )}
            {pillars.map((pillar) => (
              <p key={pillar.title} className="text-sm">
                <span className="font-medium">{pillar.title}. </span>
                {pillar.description}
              </p>
            ))}
            {tips.map((tip) => (
              <p key={tip} className="text-sm text-muted-foreground">
                {tip}
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-2">
        <Button
          variant="outline"
          className="h-12 rounded-2xl"
          onClick={() => setPaywallOpen(true)}
        >
          Тарифы и реферал 30/10
        </Button>
        <Button variant="ghost" className="rounded-2xl" onClick={onReanalyze}>
          Разобрать профиль ещё раз
        </Button>
      </div>

      {teleprompterOpen && selected && !selectedLocked && (
        <TeleprompterMode
          title={selected.title}
          script={selected.teleprompterScript}
          visualCues={selected.visualCues}
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

function ScriptCard({
  script,
  duration,
  referralUrl,
  locked,
  onShoot,
  onUnlock,
}: {
  script: AppScript;
  duration: number;
  referralUrl: string;
  locked: boolean;
  onShoot: () => void;
  onUnlock: () => void;
}) {
  const hooks = Array.isArray(script.hookOptions) ? script.hookOptions : [];

  return (
    <article className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            {duration} сек
          </p>
          <h3 className="mt-1 text-xl font-semibold leading-snug">
            {script.title}
          </h3>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {hooks.map((hook) => (
          <span
            key={hook}
            className="rounded-full bg-accent px-3 py-1.5 text-sm leading-snug text-accent-foreground"
          >
            {hook}
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm">
        <span className="text-muted-foreground">В конце. </span>
        {script.cta}
      </p>

      {locked ? (
        <div className="mt-4 rounded-2xl bg-muted/70 p-4 text-sm text-muted-foreground">
          Этот суфлёр закрыт. Бесплатно читаешь один полный — остальные на
          тарифе.
        </div>
      ) : (
        <>
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {script.teleprompterScript}
          </p>
          {script.visualCues?.start0_3s && (
            <div className="mt-3 rounded-xl border border-border/70 bg-accent/30 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-accent-foreground">Кадр 0–3с: </span>
              {script.visualCues.start0_3s}
            </div>
          )}
        </>
      )}

      <div className="mt-5 grid gap-2">
        <Button className="h-12 rounded-2xl text-base" onClick={onShoot}>
          <Video className="size-4" />
          {locked ? "Открыть и снимать" : "Снимать"}
        </Button>
        {locked && (
          <Button
            variant="outline"
            className="h-11 rounded-2xl"
            onClick={onUnlock}
          >
            <Lock className="size-4" /> Открыть все
          </Button>
        )}
        <ReferralShareBar referralUrl={referralUrl} />
      </div>
    </article>
  );
}
