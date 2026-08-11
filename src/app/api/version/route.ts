import { NextResponse } from "next/server";

import { APP_VERSION } from "@/lib/version";

/** Публичная версия сервиса для мониторинга / отладки */
export async function GET() {
  return NextResponse.json({
    name: "ReelsFactory",
    version: APP_VERSION,
  });
}
