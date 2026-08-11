"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export type ClientAccount = {
  id: string;
  socialHandle: string;
  platform: string;
  label?: string | null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addAccount() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ account: ClientAccount }>("/api/clients", {
        method: "POST",
        body: JSON.stringify({ userId, socialHandle: handle }),
      });
      setAccounts((prev) => [...prev, data.account]);
      setHandle("");
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
        <h2 className="font-semibold">Клиентские аккаунты</h2>
        <p className="text-xs text-muted-foreground">
          Тариф Агентство — до 5 аккаунтов
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="@client.brand"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
        <Button
          type="button"
          size="icon"
          disabled={loading || handle.trim().length < 2}
          onClick={() => void addAccount()}
        >
          <Plus className="size-4" />
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
              className="flex-1 text-left font-medium"
              onClick={() => onAnalyzeClient(account.id)}
            >
              @{account.socialHandle}
              <span className="ml-2 text-xs text-muted-foreground">
                {account.platform}
              </span>
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
