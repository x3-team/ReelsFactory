"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppAnalysis, AppScript } from "@/lib/client-api";

export function AgencyReportButton({
  analysis,
  clientLabel,
}: {
  analysis: AppAnalysis;
  clientLabel?: string;
}) {
  function openReport() {
    const html = buildAgencyReportHtml({
      analysis,
      clientLabel: clientLabel || `@${analysis.socialHandle}`,
    });
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={openReport}>
      <Printer className="size-4" />
      Отчёт для клиента
    </Button>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAgencyReportHtml({
  analysis,
  clientLabel,
}: {
  analysis: AppAnalysis;
  clientLabel: string;
}) {
  const tips = analysis.profileAuditTips || [];
  const pillars = analysis.contentPillars || [];
  const scripts = analysis.scripts || [];
  const date = analysis.createdAt
    ? new Date(analysis.createdAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("ru-RU");

  const tipsHtml = tips
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join("");
  const pillarsHtml = pillars
    .map(
      (p, i) =>
        `<div class="block"><strong>Тема ${i + 1}. ${escapeHtml(p.title)}</strong>${
          p.description
            ? `<p>${escapeHtml(p.description)}</p>`
            : ""
        }</div>`,
    )
    .join("");
  const scriptsHtml = scripts
    .map(
      (s: AppScript, i: number) => `
      <section class="script">
        <h3>Сценарий ${i + 1}: ${escapeHtml(s.title)}</h3>
        <p class="meta">${escapeHtml(s.format || "")}${
          s.cta ? ` · CTA: ${escapeHtml(s.cta)}` : ""
        }</p>
        ${
          Array.isArray(s.hookOptions) && s.hookOptions.length
            ? `<p><strong>Хуки:</strong> ${s.hookOptions
                .map((h) => escapeHtml(h))
                .join(" · ")}</p>`
            : ""
        }
        <pre>${escapeHtml(s.teleprompterScript || "")}</pre>
        ${
          s.caption
            ? `<p class="caption"><strong>Пост:</strong> ${escapeHtml(s.caption)}</p>`
            : ""
        }
      </section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Отчёт ReelsFactory — ${escapeHtml(clientLabel)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      margin: 0;
      padding: 32px;
      color: #12141a;
      line-height: 1.5;
      max-width: 820px;
    }
    h1 { font-size: 1.75rem; margin: 0 0 4px; }
    h2 { font-size: 1.15rem; margin: 28px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    h3 { font-size: 1.05rem; margin: 0 0 6px; }
    .brand { color: #e11d48; }
    .muted { color: #6b7280; font-size: 0.9rem; }
    .block { margin: 10px 0; padding: 10px 12px; background: #f8fafc; border-radius: 10px; }
    .block p { margin: 6px 0 0; color: #4b5563; font-size: 0.95rem; }
    ul { margin: 8px 0; padding-left: 1.2rem; }
    .script { margin: 16px 0 24px; page-break-inside: avoid; }
    .meta { color: #6b7280; font-size: 0.85rem; margin: 0 0 8px; }
    pre {
      white-space: pre-wrap;
      font-family: inherit;
      background: #0f1218;
      color: #f8fafc;
      padding: 14px;
      border-radius: 12px;
      font-size: 0.95rem;
      line-height: 1.45;
    }
    .caption { margin-top: 8px; font-size: 0.92rem; }
    .actions { margin: 16px 0 28px; }
    button {
      background: #e11d48; color: white; border: 0; border-radius: 10px;
      padding: 10px 16px; font-weight: 600; cursor: pointer;
    }
    @media print {
      .actions { display: none; }
      body { padding: 12px; }
      pre { background: #f3f4f6; color: #111; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Печать / PDF</button>
  </div>
  <p class="muted">Reels<span class="brand">Factory</span> · отчёт для клиента</p>
  <h1>${escapeHtml(clientLabel)}</h1>
  <p class="muted">${escapeHtml(analysis.platform)} · ${escapeHtml(date)}</p>
  ${
    analysis.niche
      ? `<p><strong>Ниша:</strong> ${escapeHtml(analysis.niche)}</p>`
      : ""
  }
  ${
    analysis.targetAudience
      ? `<p><strong>Аудитория:</strong> ${escapeHtml(analysis.targetAudience)}</p>`
      : ""
  }
  ${
    tipsHtml
      ? `<h2>Что поправить в профиле</h2><ul>${tipsHtml}</ul>`
      : ""
  }
  ${pillarsHtml ? `<h2>Темы на неделю</h2>${pillarsHtml}` : ""}
  <h2>Сценарии</h2>
  ${scriptsHtml || "<p class='muted'>Сценарии недоступны</p>"}
  <p class="muted" style="margin-top:40px">Сгенерировано в ReelsFactory. Не является офертой агентства.</p>
</body>
</html>`;
}
