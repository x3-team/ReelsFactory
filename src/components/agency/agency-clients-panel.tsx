"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { NICHE_PRESETS } from "@/lib/niche-presets";

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
  const [handle, setHandle] = useState("");
  const [label, setLabel] = useState("");
  const [offerSummary, setOfferSummary] = useState("");
  const [nichePreset, setNichePreset] = useState("custom");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function removeAccount(id: string) {
    await api(`/api/clients?userId=${userId}&id=${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div>
        <h2 className="font-semibold">Клиенты · Agency 2.0</h2>
        <p className="text-xs text-muted-foreground">
          До 5 аккаунтов · бриф и ниша на каждого · анализ в один клик
        </p>
      </div>

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
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={nichePreset}
          onChange={(e) => setNichePreset(e.target.value)}
        >
          {NICHE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          className="w-full"
          disabled={loading || handle.trim().length < 2}
          onClick={() => void addAccount()}
        >
          <Plus className="size-4" /> Добавить клиента
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="space-y-2">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
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
                @{account.socialHandle} · {account.platform}
                {account.nichePreset ? ` · ${account.nichePreset}` : ""}
              </div>
            </button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => void removeAccount(account.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
        {accounts.length === 0 && (
          <li className="text-sm text-muted-foreground">Пока пусто</li>
        )}
      </ul>
    </section>
  );
}
