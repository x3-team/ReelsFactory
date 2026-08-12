"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clapperboard,
  Copy,
  Lock,
  MessageCircle,
  Video,
} from "lucide-react";

import { AgencyClientsPanel } from "@/components/agency/agency-clients-panel";
import { PaywallDrawer, type PaywallReason } from "@/components/paywall/paywall-drawer";
import { ReferralShareBar } from "@/components/paywall/referral-share-bar";
import { ScriptShareCard } from "@/components/paywall/script-share-card";
import { ContentStudioTools } from "@/components/results/content-studio-tools";
import { TeleprompterMode } from "@/components/results/teleprompter";
import { UsageQuotaCard } from "@/components/results/usage-quota-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  api,
  type AppAnalysis,
  type AppAnalysisSummary,
  type AppCalendarDay,
  type AppFunnel,
  type AppPlatformPack,
  type AppScript,
  type AppShootDay,
  type AppUsageSnapshot,
  type AppUser,
} from "@/lib/client-api";
import type { PlanId } from "@/lib/config";
import { PLANS } from "@/lib/config";
import { formatPlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";

type PlatformTab = "reels" | "vk_clips" | "shorts" | "telegram_post";
type MainTab = "scripts" | "shoot" | "strategy" | "studio";

const PLATFORM_TABS: Array<{ id: PlatformTab; label: string }> = [
  { id: "reels", label: "Reels" },
  { id: "vk_clips", label: "VK Клипы" },
  { id: "shorts", label: "Shorts" },
  { id: "telegram_post", label: "Telegram" },
];

const MAIN_TABS: Array<{ id: MainTab; label: string }> = [
  { id: "scripts", label: "Сценарии" },
  { id: "shoot", label: "Съёмка" },
  { id: "strategy", label: "Стратегия" },
  { id: "studio", label: "Студия" },
];

const ROLE_LABEL: Record<string, string> = {
  trust: "Доверие",
  expert: "Эксперт",
  offer: "Оффер",
  social_proof: "Соцдок",
  entertainment: "Вовлечение",
};

export function ResultsDashboard({
  user,
  analysis,
  referralUrl,
  clientAccounts = [],
  usage,
  onSelectPlan,
  loadingPlan,
  onReanalyze,
  onAnalyzeClient,
  onScriptsUpdated,
  onAnalysisChange,
  onUserPatch,
}: {
  user: AppUser;
  analysis: AppAnalysis;
  referralUrl: string;
  clientAccounts?: Array<{
    id: string;
    socialHandle: string;
    platform: string;
    label?: string | null;
    offerSummary?: string | null;
    nichePreset?: string | null;
  }>;
  usage?: AppUsageSnapshot | null;
  onSelectPlan: (plan: Exclude<PlanId, "FREE">) => Promise<void> | void;
  loadingPlan?: string | null;
  onReanalyze: () => void;
  onAnalyzeClient?: (clientAccountId: string) => void;
  onScriptsUpdated?: (scripts: AppScript[]) => void;
  onAnalysisChange?: (analysis: AppAnalysis) => void;
  onUserPatch?: (patch: Partial<AppUser>) => void;
}) {
  const [selectedId, setSelectedId] = useState(analysis.scripts[0]?.id);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>("generic");
  const [platformTab, setPlatformTab] = useState<PlatformTab>("reels");
  const [mainTab, setMainTab] = useState<MainTab>("scripts");
  const [reanalyzeArmed, setReanalyzeArmed] = useState(false);
  const [history, setHistory] = useState<AppAnalysisSummary[]>([]);
  const [historyBusy, setHistoryBusy] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(analysis.scripts[0]?.id);
    // Reset selection when switching a past analysis, not when studio adds a script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.id]);

  useEffect(() => {
    void api<{ analyses: AppAnalysisSummary[] }>(
      `/api/analyze?userId=${encodeURIComponent(user.id)}`,
    )
      .then((data) => setHistory(data.analyses || []))
      .catch(() => undefined);
  }, [user.id, analysis.id]);

  const selected = useMemo(
    () => analysis.scripts.find((s) => s.id === selectedId) || analysis.scripts[0],
    [analysis.scripts, selectedId],
  );

  const tips = analysis.profileAuditTips || [];
  const pillars = analysis.contentPillars || [];
  const shootDay = analysis.shootDayPlan as AppShootDay | null | undefined;
  const calendar = (analysis.pillarsCalendar || []) as AppCalendarDay[];
  const funnelKit = analysis.funnelKit as AppFunnel | null | undefined;
  const isFree = user.subscriptionPlan === "FREE";
  const canStudio =
    user.subscriptionPlan === "PRO" || user.subscriptionPlan === "AGENCY";
  const planLabel = PLANS[user.subscriptionPlan]?.name || user.subscriptionPlan;

  function openPaywall(reason: PaywallReason) {
    setPaywallReason(reason);
    setPaywallOpen(true);
  }

  function handleReanalyze() {
    if (!reanalyzeArmed) {
      setReanalyzeArmed(true);
      return;
    }
    setReanalyzeArmed(false);
    onReanalyze();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4 pb-10">
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            @{analysis.socialHandle} · {formatPlatform(analysis.platform)}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Сценарии готовы
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Снял раз — выложи в Reels, VK и Telegram
          </p>
          {usage && <div className="mt-2"><UsageQuotaCard usage={usage} /></div>}
        </div>
        <Badge className="shrink-0 bg-primary/15 text-primary hover:bg-primary/20">
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

      <div className="sticky top-0 z-20 -mx-4 border-b border-border/80 bg-background/90 px-4 py-2 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMainTab(tab.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                mainTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mainTab === "scripts" && (
        <section className="space-y-3">
          {analysis.scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Сценариев пока нет — запустите анализ ещё раз.
            </p>
          ) : (
            <>
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-1 pr-8">
                  {analysis.scripts.map((script, index) => (
                    <button
                      key={script.id}
                      type="button"
                      onClick={() => setSelectedId(script.id)}
                      className={cn(
                        "min-w-[10rem] rounded-2xl border px-3 py-3 text-left text-sm",
                        selected?.id === script.id
                          ? "border-primary bg-primary/10"
                          : "border-border",
                      )}
                    >
                      <div className="mb-1 text-xs text-muted-foreground">
                        {script.sourceType === "remake"
                          ? "Ремейк"
                          : script.sourceType === "autopsy"
                            ? "Пересъём"
                            : `Сценарий ${index + 1}`}
                        {script.durationSec ? ` · ${script.durationSec}с` : ""}
                        {script.isTeaser ? " · тизер" : ""}
                      </div>
                      <div className="line-clamp-2 font-medium">{script.title}</div>
                    </button>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background" />
              </div>

              {selected && (
                <ScriptViewer
                  script={selected}
                  userId={user.id}
                  referralUrl={referralUrl}
                  handle={analysis.socialHandle}
                  platformTab={platformTab}
                  onPlatformTab={setPlatformTab}
                  lockedTeleprompter={isFree && selected.isTeaser}
                  packsLocked={isFree}
                  onOpenTeleprompter={() => {
                    if (isFree && selected.isTeaser) {
                      openPaywall("scripts");
                      return;
                    }
                    setTeleprompterOpen(true);
                  }}
                  onUnlock={() => openPaywall("scripts")}
                />
              )}
            </>
          )}
        </section>
      )}

      {mainTab === "shoot" && (
        <div className="space-y-3">
          {funnelKit && (
            <FunnelCard
              funnel={funnelKit}
              locked={isFree}
              onUnlock={() => openPaywall("funnel")}
            />
          )}
          {shootDay && (
            <ShootDayCard
              plan={shootDay}
              locked={isFree}
              onUnlock={() => openPaywall("shoot")}
            />
          )}
          {calendar.length > 0 && (
            <CalendarCard
              days={calendar}
              locked={isFree}
              onUnlock={() => openPaywall("calendar")}
            />
          )}
        </div>
      )}

      {mainTab === "strategy" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ниша
            </p>
            <p className="mt-1 font-medium">{analysis.niche}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Аудитория
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {analysis.targetAudience}
            </p>
          </div>

          {tips.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Советы по аудиту</h2>
              <ul className="space-y-2 text-sm">
                {tips.map((tip) => (
                  <li
                    key={tip}
                    className="rounded-xl border border-border/80 px-3 py-2 leading-relaxed"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pillars.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Контент‑столпы</h2>
              <div className="grid gap-2">
                {pillars.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="rounded-xl border border-border/80 px-3 py-3"
                  >
                    <p className="font-medium">{pillar.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Button
            variant={reanalyzeArmed ? "destructive" : "outline"}
            onClick={handleReanalyze}
          >
            {reanalyzeArmed
              ? "Точно? Спишется 1 анализ"
              : "Запустить новый анализ"}
          </Button>

          {history.length > 1 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">История разборов</h2>
              <div className="grid gap-2">
                {history.map((item) => {
                  const active = item.id === analysis.id;
                  const date = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })
                    : "";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={active || historyBusy === item.id}
                      onClick={() => {
                        if (!onAnalysisChange) return;
                        setHistoryBusy(item.id);
                        void api<{ analysis: AppAnalysis }>(
                          `/api/analyze?id=${encodeURIComponent(item.id)}&userId=${encodeURIComponent(user.id)}`,
                        )
                          .then((data) => onAnalysisChange(data.analysis))
                          .finally(() => setHistoryBusy(null));
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left",
                        active ? "border-primary bg-primary/10" : "border-border/80",
                      )}
                    >
                      <p className="font-medium">
                        @{item.socialHandle} · {item.platform}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date}
                        {item.niche ? ` · ${item.niche}` : ""}
                        {` · ${item.status}`}
                        {historyBusy === item.id ? " · открываем…" : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {mainTab === "studio" && (
        <ContentStudioTools
          userId={user.id}
          analysisId={analysis.id}
          canUse={canStudio}
          remakesLeft={usage?.remaining.remakes ?? 0}
          autopsiesLeft={usage?.remaining.autopsies ?? 0}
          onLocked={() => openPaywall("studio")}
          onScriptCreated={(script) => {
            onScriptsUpdated?.([...(analysis.scripts || []), script]);
            setSelectedId(script.id);
            setMainTab("scripts");
          }}
        />
      )}

      <div className="grid gap-2 pt-2">
        <Button variant="outline" onClick={() => openPaywall("generic")}>
          Тарифы
        </Button>
        <ReferralShareBar referralUrl={referralUrl} />
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
        userId={user.id}
        onSelectPlan={onSelectPlan}
        loadingPlan={loadingPlan}
        reason={paywallReason}
        onBalanceChange={(balance) => {
          onUserPatch?.({ referralBalance: balance });
        }}
      />
    </div>
  );
}

function FunnelCard({
  funnel,
  locked,
  onUnlock,
}: {
  funnel: AppFunnel;
  locked: boolean;
  onUnlock: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copyKeyword() {
    await navigator.clipboard.writeText(funnel.comment_keyword);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4 text-primary" /> Воронка коммент → Telegram
        </CardTitle>
        <CardDescription>
          Зритель пишет слово боту — приходит лидмагнит
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {locked ? (
          <Button variant="outline" className="w-full" onClick={onUnlock}>
            <Lock className="size-4" /> Открыть воронку
          </Button>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/70 px-3 py-2">
              <span>
                Слово: <strong>{funnel.comment_keyword}</strong>
              </span>
              <Button size="sm" variant="ghost" onClick={() => void copyKeyword()}>
                <Copy className="size-3.5" />
                {copied ? "OK" : ""}
              </Button>
            </div>
            <p>
              <span className="font-medium">Лидмагнит:</span> {funnel.lead_magnet}
            </p>
            <p className="text-muted-foreground">{funnel.bot_reply}</p>
            <p className="text-xs text-muted-foreground">
              Зритель пишет это слово боту в Telegram — приходит ответ с лидмагнитом.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ShootDayCard({
  plan,
  locked,
  onUnlock,
}: {
  plan: AppShootDay;
  locked: boolean;
  onUnlock: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="size-4 text-primary" /> {plan.title || "Съёмочный день"}
        </CardTitle>
        <CardDescription>
          ~{plan.duration_min} мин · один образ · батч без хаоса
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {locked ? (
          <Button variant="outline" className="w-full" onClick={onUnlock}>
            <Lock className="size-4" /> Открыть план съёмки
          </Button>
        ) : (
          <>
            <p>
              <span className="font-medium">Образ:</span> {plan.outfit}
            </p>
            <p>
              <span className="font-medium">Локация:</span> {plan.location}
            </p>
            <div>
              <p className="mb-1 font-medium">Пропы</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {(plan.props || []).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Порядок съёмки</p>
              {(plan.order || []).map((item) => (
                <div
                  key={`${item.shoot_order}-${item.script_title}`}
                  className="rounded-xl border px-3 py-2"
                >
                  <div className="font-medium">
                    {item.shoot_order}. {item.script_title} · {item.duration_sec}с
                  </div>
                  <div className="text-xs text-muted-foreground">{item.note}</div>
                </div>
              ))}
            </div>
            {(plan.extra_ideas || []).length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Досъём · идеи</p>
                {plan.extra_ideas.map((idea) => (
                  <div key={idea.title} className="rounded-xl bg-secondary/60 px-3 py-2">
                    <div className="font-medium">{idea.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {idea.hook} · {idea.pillar} · {idea.duration_sec}с
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarCard({
  days,
  locked,
  onUnlock,
}: {
  days: AppCalendarDay[];
  locked: boolean;
  onUnlock: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4 text-primary" /> Календарь · 7 дней
        </CardTitle>
        <CardDescription>
          Доверие, эксперт, оффер и соцдок по кругу
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {locked ? (
          <Button variant="outline" className="w-full" onClick={onUnlock}>
            <Lock className="size-4" /> Открыть календарь
          </Button>
        ) : (
          days.map((day) => (
            <div
              key={day.day}
              className="flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">
                  День {day.day} · {day.topic}
                </div>
                <div className="text-xs text-muted-foreground">
                  {day.pillar} · {ROLE_LABEL[day.role] || day.role}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                {day.platform_focus}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ScriptViewer({
  script,
  userId,
  referralUrl,
  handle,
  platformTab,
  onPlatformTab,
  lockedTeleprompter,
  packsLocked,
  onOpenTeleprompter,
  onUnlock,
}: {
  script: AppScript;
  userId: string;
  referralUrl: string;
  handle?: string;
  platformTab: PlatformTab;
  onPlatformTab: (tab: PlatformTab) => void;
  lockedTeleprompter: boolean;
  packsLocked: boolean;
  onOpenTeleprompter: () => void;
  onUnlock: () => void;
}) {
  const hooks = Array.isArray(script.hookOptions) ? script.hookOptions : [];
  const packs = script.platformPacks as AppPlatformPack | null | undefined;
  const props = Array.isArray(script.propsChecklist) ? script.propsChecklist : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">{script.title}</CardTitle>
        <CardDescription>
          {script.format}
          {script.commentKeyword ? ` · слово «${script.commentKeyword}»` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Хуки
          </p>
          <ul className="space-y-2">
            {hooks.map((hook, index) => (
              <HookFeedbackRow
                key={`${script.id}-${index}`}
                hook={hook}
                index={index}
                scriptId={script.id}
                userId={userId}
                locked={packsLocked}
              />
            ))}
          </ul>
        </div>

        {props.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Что подготовить
            </p>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {props.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Суфлёр
          </p>
          <pre className="whitespace-pre-wrap rounded-xl bg-secondary/50 p-3 text-sm leading-relaxed">
            {script.teleprompterScript}
          </pre>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Пакет площадок
          </p>
          <div className="flex gap-1 overflow-x-auto">
            {PLATFORM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onPlatformTab(tab.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  platformTab === tab.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {packsLocked || !packs ? (
            <Button variant="outline" className="w-full" onClick={onUnlock}>
              <Lock className="size-4" /> Открыть кросс‑пакет
            </Button>
          ) : (
            <PlatformPackView packs={packs} tab={platformTab} />
          )}
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
            {lockedTeleprompter ? "Открыть суфлёр" : "Режим суфлёра"}
          </Button>
          {lockedTeleprompter && (
            <Button variant="outline" onClick={onUnlock}>
              <Lock className="size-4" /> Смотреть все сценарии
            </Button>
          )}
          <ScriptShareCard
            script={script}
            referralUrl={referralUrl}
            handle={handle}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HookFeedbackRow({
  hook,
  index,
  scriptId,
  userId,
  locked,
}: {
  hook: string;
  index: number;
  scriptId: string;
  userId: string;
  locked: boolean;
}) {
  const [outcome, setOutcome] = useState<"flew" | "flopped" | null>(null);
  const [saving, setSaving] = useState(false);

  async function send(next: "flew" | "flopped") {
    if (locked) return;
    setSaving(true);
    try {
      await api("/api/hooks/feedback", {
        method: "POST",
        body: JSON.stringify({
          userId,
          scriptId,
          hookIndex: index,
          outcome: next,
        }),
      });
      setOutcome(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-xl bg-secondary/60 px-3 py-2 text-sm">
      <p>{hook}</p>
      {!locked && (
        <div className="mt-1.5 flex gap-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void send("flew")}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              outcome === "flew"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            Залетело
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void send("flopped")}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              outcome === "flopped"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground",
            )}
          >
            Не залетело
          </button>
        </div>
      )}
    </li>
  );
}

function PlatformPackView({
  packs,
  tab,
}: {
  packs: AppPlatformPack;
  tab: PlatformTab;
}) {
  if (tab === "reels") {
    return (
      <div className="space-y-2 rounded-xl border p-3 text-sm">
        <p className="whitespace-pre-wrap">{packs.reels.caption}</p>
        <p className="font-medium">{packs.reels.cta}</p>
        {packs.reels.hashtags?.length ? (
          <p className="text-xs text-muted-foreground">
            {packs.reels.hashtags.join(" ")}
          </p>
        ) : null}
      </div>
    );
  }
  if (tab === "vk_clips") {
    return (
      <div className="space-y-2 rounded-xl border p-3 text-sm">
        <p className="whitespace-pre-wrap">{packs.vk_clips.caption}</p>
        <p className="font-medium">{packs.vk_clips.cta}</p>
      </div>
    );
  }
  if (tab === "shorts") {
    return (
      <div className="space-y-2 rounded-xl border p-3 text-sm">
        <p className="font-medium">{packs.shorts.title}</p>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {packs.shorts.description}
        </p>
        <p className="font-medium">{packs.shorts.cta}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border p-3 text-sm">
      <p className="whitespace-pre-wrap">{packs.telegram_post.text}</p>
      <p className="font-medium">{packs.telegram_post.cta}</p>
    </div>
  );
}
