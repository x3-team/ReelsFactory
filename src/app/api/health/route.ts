import { NextResponse } from "next/server";

import { paymentsEnabled } from "@/lib/config";
import { checkDbHealth } from "@/lib/db-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Process is up + Postgres is reachable. No env, tokens, or connection strings.
 */
export async function GET() {
  const started = Date.now();
  const db = await checkDbHealth();
  return NextResponse.json(
    {
      ok: db.ok,
      db: db.db,
      payments: paymentsEnabled() ? "up" : "unavailable",
      telegram: process.env.TELEGRAM_BOT_TOKEN ? "up" : "unset",
      service: "reelsfactory",
      latencyMs: Date.now() - started,
    },
    { status: db.ok ? 200 : 503 },
  );
}
