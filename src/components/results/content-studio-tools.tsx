"use client";

import { useState } from "react";
import { Link2, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, type AppScript } from "@/lib/client-api";

/** Viral remake + «why didn't viral» autopsy tools */
export function ContentStudioTools({
  userId,
  analysisId,
  canUse,
  remakesLeft = 0,
  autopsiesLeft = 0,
  onLocked,
  onScriptCreated,
}: {
  userId: string;
  analysisId: string;
  canUse: boolean;
  remakesLeft?: number;
  autopsiesLeft?: number;
  onLocked: () => void;
  onScriptCreated: (script: AppScript) => void;
}) {
  const [remakeUrl, setRemakeUrl] = useState("");
  const [remakeNote, setRemakeNote] = useState("");
  const [autopsyUrl, setAutopsyUrl] = useState("");
  const [loading, setLoading] = useState<"remake" | "autopsy" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autopsyScore, setAutopsyScore] = useState<number | null>(null);
  const [autopsyFindings, setAutopsyFindings] = useState<string[] | null>(null);

  async function runRemake() {
    if (!canUse) {
      onLocked();
      return;
    }
    setLoading("remake");
    setError(null);
    try {
      const data = await api<{ script: AppScript | null }>(
        "/api/remake",
        {
          method: "POST",
          body: JSON.stringify({
            userId,
            analysisId,
            sourceUrl: remakeUrl.trim(),
            sourceCaption: remakeNote.trim() || undefined,
          }),
        },
      );
      if (data.script) onScriptCreated(data.script);
      setRemakeUrl("");
      setRemakeNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка ремейка");
    } finally {
      setLoading(null);
    }
  }

  async function runAutopsy() {
    if (!canUse) {
      onLocked();
      return;
    }
    setLoading("autopsy");
    setError(null);
    try {
      const data = await api<{
        script: AppScript | null;
        autopsy: {
          score: number;
          findings: {
            weak_hook_fix: string;
            retention_fix: string;
            cta_fix: string;
            reshoot_hook: string;
          };
        };
      }>("/api/autopsy", {
        method: "POST",
        body: JSON.stringify({
          userId,
          analysisId,
          sourceUrl: autopsyUrl.trim(),
        }),
      });
      setAutopsyScore(data.autopsy.score);
      setAutopsyFindings([
        data.autopsy.findings.weak_hook_fix,
        data.autopsy.findings.retention_fix,
        data.autopsy.findings.cta_fix,
        `Новый хук: ${data.autopsy.findings.reshoot_hook}`,
      ]);
      if (data.script) onScriptCreated(data.script);
      setAutopsyUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка разбора");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-base font-semibold">Студия</h2>
      {canUse ? (
        <p className="text-xs text-muted-foreground">
          Осталось ремейков: {remakesLeft} · разборов: {autopsiesLeft}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Ремейк вирусного ролика и разбор «не залетело» — на тарифах Про и Агентство.
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-4" /> Пересними вирус под себя
          </CardTitle>
          <CardDescription>
            Ссылка на чужой рилс → структура → ваш сценарий и кросс‑пакет
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="remake-url">Ссылка на ролик</Label>
          <Input
            id="remake-url"
            placeholder="https://instagram.com/reel/…"
            value={remakeUrl}
            onChange={(e) => setRemakeUrl(e.target.value)}
          />
          <Textarea
            placeholder="Коротко: о чём ролик / что зацепило (необязательно)"
            value={remakeNote}
            onChange={(e) => setRemakeNote(e.target.value)}
            rows={2}
          />
          <Button
            className="w-full"
            disabled={!remakeUrl.trim() || loading === "remake"}
            onClick={() => void runRemake()}
          >
            <Link2 className="size-4" />
            {canUse
              ? loading === "remake"
                ? "Делаем ремейк…"
                : "Адаптировать"
              : "Открыть в Про"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4" /> Почему не залетело
          </CardTitle>
          <CardDescription>
            Разбор хука / удержания / CTA + готовый пересъём
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="autopsy-url">Ссылка на ваш ролик</Label>
          <Input
            id="autopsy-url"
            placeholder="https://…"
            value={autopsyUrl}
            onChange={(e) => setAutopsyUrl(e.target.value)}
          />
          <Button
            className="w-full"
            variant="outline"
            disabled={!autopsyUrl.trim() || loading === "autopsy"}
            onClick={() => void runAutopsy()}
          >
            {canUse
              ? loading === "autopsy"
                ? "Разбираем…"
                : "Разобрать и переснять"
              : "Открыть в Про"}
          </Button>
          {autopsyScore != null && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium">Оценка: {autopsyScore}/100</p>
              <ul className="mt-2 list-inside list-disc text-muted-foreground">
                {(autopsyFindings || []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
