"use client";

import { Gauge } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppUsageSnapshot } from "@/lib/client-api";

export function UsageQuotaCard({ usage }: { usage: AppUsageSnapshot }) {
  const rows = [
    {
      label: "Сценарии",
      used: usage.usage.scripts,
      max: usage.limits.scriptsPerMonth,
      left: usage.remaining.scripts,
    },
    {
      label: "Анализы",
      used: usage.usage.analyses,
      max: usage.limits.analysesPerMonth,
      left: usage.remaining.analyses,
    },
    {
      label: "Ремейки",
      used: usage.usage.remakes,
      max: usage.limits.remakesPerMonth,
      left: usage.remaining.remakes,
    },
    {
      label: "Разборы",
      used: usage.usage.autopsies,
      max: usage.limits.autopsiesPerMonth,
      left: usage.remaining.autopsies,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="size-4" /> Лимиты месяца
        </CardTitle>
        <CardDescription>
          Ремейк и разбор списываются и из своей квоты, и из сценариев
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <span>{row.label}</span>
            <span className="text-muted-foreground">
              {row.used}/{row.max}
              {row.max > 0 ? ` · осталось ${row.left}` : " · недоступно"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
