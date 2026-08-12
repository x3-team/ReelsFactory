"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clapperboard,
  Copy,
  Lock,
  MessageCircle,
  Sparkles,
  Target,
  Users,
  Video,
} from "lucide-react";

import { AgencyClientsPanel } from "@/components/agency/agency-clients-panel";
import { PaywallDrawer } from "@/components/paywall/paywall-drawer";
import { ScriptShareCard } from "@/components/paywall/script-share-card";
import { ContentStudioTools } from "@/components/results/content-studio-tools";
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
import type {
  AppAnalysis,
  AppCalendarDay,
  AppFunnel,
  AppPlatformPack,
  AppScript,
  AppShootDay,
  AppUser,
} from "@/lib/client-api";
import type { PlanId } from "@/lib/config";
import { PLANS } from "@/lib/config";
import { cn } from "@/lib/utils";

type PlatformTab = "reels" | "vk_clips" | "shorts" | "telegram_post";

const PLATFORM_TABS: Array<{ id: PlatformTab; label: string }> = [
  { id: "reels", label: "Reels" },
  { id: "vk_clips", label: "VK Клипы" },
  { id: "shorts", label: "Shorts" },
  { id: "telegram_post", label: "Telegram" },
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
  onSelectPlan,
  loadingPlan,
  onReanalyze,
  onAnalyzeClient,
  onScriptsUpdated,
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
  onSelectPlan: (plan: Exclude<PlanId, "FREE">) => Promise<void> | void;
  loadingPlan?: string | null;
  onReanalyze: () => void;
  onAnalyzeClient?: (clientAccountId: string) => void;
  onScriptsUpdated?: (scripts: AppScript[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(analysis.scripts[0]?.id);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [platformTab, setPlatformTab] = useState<PlatformTab>("reels");

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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4 pb-10">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            @{analysis.socialHandle} · {analysis.platform}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Контент‑фабрика
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Снял раз — выложи в Reels, VK и Telegram
          </p>
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

      {funnelKit && (
        <FunnelCard
          funnel={funnelKit}
          locked={isFree}
          onUnlock={() => setPaywallOpen(true)}
        />
      )}

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

      {shootDay && (
        <ShootDayCard
          plan={shootDay}
          locked={isFree}
          onUnlock={() => setPaywallOpen(true)}
        />
      )}

      {calendar.length > 0 && (
        <CalendarCard
          days={calendar}
          locked={isFree}
          onUnlock={() => setPaywallOpen(true)}
        />
      )}

      <ContentStudioTools
        userId={user.id}
        analysisId={analysis.id}
        canUse={canStudio}
        onLocked={() => setPaywallOpen(true)}
        onScriptCreated={(script) => {
          onScriptsUpdated?.([...(analysis.scripts || []), script]);
          setSelectedId(script.id);
        }}
      />

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

        {selected && (
          <ScriptViewer
            script={selected}
            referralUrl={referralUrl}
            handle={analysis.socialHandle}
            platformTab={platformTab}
            onPlatformTab={setPlatformTab}
            lockedTeleprompter={isFree && selected.isTeaser}
            packsLocked={isFree}
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
          <MessageCircle className="size-4" /> Воронка коммент → Telegram
        </CardTitle>
        <CardDescription>
          Зритель пишет слово в комментарии — бот отдаёт лидмагнит
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {locked ? (
          <Button variant="outline" className="w-full" onClick={onUnlock}>
            <Lock className="size-4" /> Открыть воронку на Старт+
          </Button>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/70 px-3 py-2">
              <span>
                Ключевое слово: <strong>{funnel.comment_keyword}</strong>
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
            <p className="text-xs text-muted-foreground">{funnel.telegram_cta}</p>
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
          <Video className="size-4" /> {plan.title || "Съёмочный день"}
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
                  className="rounded-lg border px-3 py-2"
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
                  <div key={idea.title} className="rounded-lg bg-secondary/60 px-3 py-2">
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
          <CalendarDays className="size-4" /> Календарь столпов · 7 дней
        </CardTitle>
        <CardDescription>
          Чередование доверия, эксперта, оффера и соцдока
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
              className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
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
        <CardTitle className="text-lg">{script.title}</CardTitle>
        <CardDescription>
          {script.format}
          {script.commentKeyword ? ` · слово «${script.commentKeyword}»` : ""}
        </CardDescription>
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

        {props.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Текст для суфлёра
          </p>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
            {script.teleprompterScript}
          </pre>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <Lock className="size-4" /> Открыть кросс‑пакет Reels / VK / TG
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
            {lockedTeleprompter ? "Открыть режим суфлёра" : "Режим суфлёра"}
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

function PlatformPackView({
  packs,
  tab,
}: {
  packs: AppPlatformPack;
  tab: PlatformTab;
}) {
  if (tab === "reels") {
    return (
      <div className="space-y-2 rounded-lg border p-3 text-sm">
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
      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <p className="whitespace-pre-wrap">{packs.vk_clips.caption}</p>
        <p className="font-medium">{packs.vk_clips.cta}</p>
      </div>
    );
  }
  if (tab === "shorts") {
    return (
      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <p className="font-medium">{packs.shorts.title}</p>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {packs.shorts.description}
        </p>
        <p className="font-medium">{packs.shorts.cta}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="whitespace-pre-wrap">{packs.telegram_post.text}</p>
      <p className="font-medium">{packs.telegram_post.cta}</p>
    </div>
  );
}
