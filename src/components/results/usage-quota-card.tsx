"use client";

import type { AppUsageSnapshot } from "@/lib/client-api";

export function UsageQuotaCard({ usage }: { usage: AppUsageSnapshot }) {
  const rows = [
    {
      label: "сценарии",
      used: usage.usage.scripts,
      max: usage.limits.scriptsPerMonth,
    },
    {
      label: "анализы",
      used: usage.usage.analyses,
      max: usage.limits.analysesPerMonth,
    },
    {
      label: "ремейки",
      used: usage.usage.remakes,
      max: usage.limits.remakesPerMonth,
    },
    {
      label: "разборы",
      used: usage.usage.autopsies,
      max: usage.limits.autopsiesPerMonth,
    },
  ].filter((row) => row.max > 0);

  if (rows.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {rows.map((row, i) => (
        <span key={row.label}>
          {i > 0 ? " · " : ""}
          <span className="text-foreground/80">
            {row.used}/{row.max}
          </span>{" "}
          {row.label}
        </span>
      ))}
    </p>
  );
}
