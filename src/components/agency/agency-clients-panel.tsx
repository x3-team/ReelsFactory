"use client";

import { useState } from "react";
import { ChevronDown, FileText, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { NICHE_PRESETS } from "@/lib/niche-presets";
import { cn } from "@/lib/utils";

export type ClientAccount = {
  id: string;
  socialHandle: string;
  platform: string;
  label?: string | null;
  offerSummary?: string | null;
  nichePreset?: string | null;
};

export function AgencyClientsPanel({
  userId,
  initialAccounts,
  onAnalyzeClient,
}: {
  userId: string;
  initialAccounts: ClientAccount[];
  onAnalyzeClient: (clientAccountId: string) => void;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [openForm, setOpenForm] = useState(initialAccounts.length === 0);
  const [handle, setHandle] = useState("");
  const [label, setLabel] = useState("");
  const [offerSummary, setOfferSummary] = useState("");
  const [nichePreset, setNichePreset] = useState("custom");
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  async function addAccount() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ account: ClientAccount }>("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          userId,
          socialHandle: handle,
          label: label.trim() || undefined,
          offerSummary: offerSummary.trim() || undefined,
          nichePreset: nichePreset || undefined,
        }),
      });
      setAccounts((prev) => [...prev, data.account]);
      setHandle("");
      setLabel("");
      setOfferSummary("");
      setNichePreset("custom");
      setOpenForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function removeAccount(id: string) {
    if (pendingDelete !== id) {
      setPendingDelete(id);
      return;
    }
    await api(`/api/clients?userId=${userId}&id=${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setPendingDelete(null);
  }

  async function weeklyReport() {
    setReportLoading(true);
    setError(null);
    try {
      const data = await api<{ report: string }>("/api/reports/agency", {
        method: "POST",
        body: JSON.stringify({ userId, sendTelegram: true }),
      });
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отчёта");
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/80 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold">Клиенты</h2>
          <p className="text-xs text-muted-foreground">
            До 5 аккаунтов · бриф на каждого
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={openForm ? "secondary" : "outline"}
          onClick={() => setOpenForm((v) => !v)}
        >
          {openForm ? (
            <>
              <ChevronDown className="size-4" /> Скрыть
            </>
          ) : (
            <>
              <Plus className="size-4" /> Клиент
            </>
          )}
        </Button>
      </div>

      {openForm && (
        <div className="space-y-2">
          <Label htmlFor="client-handle">@аккаунт клиента</Label>
          <Input
            id="client-handle"
            placeholder="@client.brand"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <Input
            placeholder="Лейбл (например Салон Мария)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            placeholder="Оффер клиента"
            value={offerSummary}
            onChange={(e) => setOfferSummary(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {NICHE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setNichePreset(p.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  nichePreset === p.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={loading || handle.trim().length < 2}
            onClick={() => void addAccount()}
          >
            <Plus className="size-4" /> Добавить
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="space-y-2">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/80 px-3 py-2 text-sm"
          >
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => onAnalyzeClient(account.id)}
            >
              <div className="font-medium">
                {account.label || `@${account.socialHandle}`}
              </div>
              <div className="text-xs text-muted-foreground">
                @{account.socialHandle}
                {account.nichePreset ? ` · ${account.nichePreset}` : ""}
              </div>
            </button>
            <Button
              type="button"
              size="sm"
              variant={pendingDelete === account.id ? "destructive" : "ghost"}
              onClick={() => void removeAccount(account.id)}
            >
              {pendingDelete === account.id ? (
                "Удалить?"
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </li>
        ))}
        {accounts.length === 0 && (
          <li className="text-sm text-muted-foreground">Пока пусто</li>
        )}
      </ul>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={reportLoading}
        onClick={() => void weeklyReport()}
      >
        <FileText className="size-4" />
        {reportLoading ? "Собираем отчёт…" : "Отчёт за неделю"}
      </Button>
      {report && (
        <div className="space-y-1 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed">
          {report.split("\n").map((line, i) => (
            <p key={`${i}-${line}`}>{line || "\u00a0"}</p>
          ))}
        </div>
      )}
    </section>
  );
}
