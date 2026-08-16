"use client";

import { useMemo, useState } from "react";
import {
  Clapperboard,
  Lock,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { AgencyClientsPanel } from "@/components/agency/agency-clients-panel";
import { PaywallDrawer } from "@/components/paywall/paywall-drawer";
import { ReferralShareBar } from "@/components/paywall/referral-share-bar";
import { TeleprompterMode } from "@/components/results/teleprompter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const selected = useMemo(
    () => analysis.scripts.find((s) => s.id === selectedId) || analysis.scripts[0],
    [analysis.scripts, selectedId],
  );

  const tips = analysis.profileAuditTips || [];
  const pillars = analysis.contentPillars || [];
  const isFree = user.subscriptionPlan === "FREE";
  const planLabel = PLANS[user.subscriptionPlan]?.name || user.subscriptionPlan;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4 pb-10">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            @{analysis.socialHandle} · {analysis.platform}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Контент‑стратегия
          </h1>
        </div>
        <Badge variant="secondary">{planLabel}</Badge>
      </header>

      {user.subscriptionPlan === "AGENCY" && onAnalyzeClient && (
        <AgencyClientsPanel
          userId={user.id}
          initialAccounts={clientAccounts}
          onAnalyzeClient={onAnalyzeClient}
        />
      )}

      <div className="grid gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4" /> Ниша
            </CardTitle>
            <CardDescription>{analysis.niche}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" /> Целевая аудитория
            </CardTitle>
            <CardDescription>{analysis.targetAudience}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Советы по аудиту
        </h2>
        <div className="space-y-2">
          {tips.map((tip) => (
            <Card key={tip}>
              <CardContent className="flex gap-3 p-4 text-sm">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>{tip}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Контент‑столпы
        </h2>
        <div className="grid gap-2">
          {pillars.map((pillar) => (
            <Card key={pillar.title}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">{pillar.title}</CardTitle>
                <CardDescription>{pillar.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Сценарии
          </h2>
          {isFree && (
            <Button size="sm" variant="outline" onClick={() => setPaywallOpen(true)}>
              <Lock className="size-3.5" /> Открыть все
            </Button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {analysis.scripts.map((script, index) => (
            <button
              key={script.id}
              type="button"
              onClick={() => setSelectedId(script.id)}
              className={cn(
                "min-w-[10rem] rounded-xl border px-3 py-3 text-left text-sm",
                selected?.id === script.id
                  ? "border-primary bg-primary/5"
                  : "border-border",
              )}
            >
              <div className="mb-1 text-xs text-muted-foreground">
                Сценарий {index + 1}
                {script.isTeaser ? " · тизер" : ""}
              </div>
              <div className="line-clamp-2 font-medium">{script.title}</div>
            </button>
          ))}
        </div>

        {selected && (
          <ScriptViewer
            script={selected}
            referralUrl={referralUrl}
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

      <div className="grid gap-2">
        <Button variant="outline" onClick={() => setPaywallOpen(true)}>
          Тарифы и реферальная ссылка
        </Button>
        <Button variant="ghost" onClick={onReanalyze}>
          Запустить новый анализ
        </Button>
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
  referralUrl,
  lockedTeleprompter,
  onOpenTeleprompter,
  onUnlock,
}: {
  script: AppScript;
  referralUrl: string;
  lockedTeleprompter: boolean;
  onOpenTeleprompter: () => void;
  onUnlock: () => void;
}) {
  const hooks = Array.isArray(script.hookOptions) ? script.hookOptions : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{script.title}</CardTitle>
        <CardDescription>{script.format}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Варианты хуков
          </p>
          <ul className="space-y-2">
            {hooks.map((hook) => (
              <li
                key={hook}
                className="rounded-lg bg-secondary/70 px-3 py-2 text-sm"
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
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
            {script.teleprompterScript?.trim()
              ? script.teleprompterScript
              : "Суфлёр пустой — запустите анализ ещё раз."}
          </pre>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">CTA:</span> {script.cta}
          </p>
          <p className="text-muted-foreground">{script.caption}</p>
        </div>

        <div className="grid gap-2">
          <Button onClick={onOpenTeleprompter}>
            <Clapperboard className="size-4" />
            {lockedTeleprompter ? "Открыть режим суфлёра" : "Режим суфлёра"}
          </Button>
          {lockedTeleprompter && (
            <Button variant="outline" onClick={onUnlock}>
              <Lock className="size-4" /> Смотреть все сценарии
            </Button>
          )}
          <ReferralShareBar referralUrl={referralUrl} />
        </div>
      </CardContent>
    </Card>
  );
}
