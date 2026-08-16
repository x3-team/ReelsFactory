/**
 * HTTP cycle: POST /api/users → onboard → POST /api/analyze → poll COMPLETED.
 * Usage: BASE_URL=http://127.0.0.1:3000 tsx scripts/http-cycle.ts
 * Optional: HANDLE=@desertmsk PLATFORM=instagram (live only with MOCK_EXTERNAL_APIS=false)
 */
const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const HANDLE = (process.env.HANDLE || "desertmsk").replace(/^@/, "");
const EXPECT_LIVE = process.env.EXPECT_LIVE === "true";

type Json = Record<string, unknown>;

async function http<T extends Json>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

function asRecord(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {};
}

async function main() {
  const health = await http("/api/health");
  if (health.status !== 200 || health.body.ok !== true || health.body.db !== "up") {
    throw new Error(`health failed: ${health.status} ${JSON.stringify(health.body)}`);
  }
  console.log("health", health.body);

  const telegramId = String(Date.now());
  const users = await http<{ user?: Json; error?: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify({
      telegramId,
      username: `http_cycle_${telegramId}`,
      firstName: "HTTP",
      lastName: "Цикл",
      languageCode: "ru",
    }),
  });
  if (users.status !== 200 || !users.body.user) {
    throw new Error(`users failed: ${users.status} ${JSON.stringify(users.body)}`);
  }
  const user = asRecord(users.body.user);
  const userId = String(user.id);

  const { prisma } = await import("../src/lib/prisma");
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: "START",
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const onboard = await http<{ user?: Json; error?: string }>("/api/users/onboard", {
    method: "POST",
    body: JSON.stringify({
      userId,
      socialHandle: `@${HANDLE}`,
      profileGoal: "GROW_AUDIENCE",
      toneOfVoice: "EXPERT",
      offerSummary: "чеклист по контенту",
    }),
  });
  if (onboard.status !== 200 || !onboard.body.user) {
    throw new Error(`onboard failed: ${onboard.status} ${JSON.stringify(onboard.body)}`);
  }

  const youtube = await http<{ error?: string }>("/api/users/onboard", {
    method: "POST",
    body: JSON.stringify({
      userId,
      socialHandle: "https://youtube.com/@linguamarina",
      profileGoal: "GROW_AUDIENCE",
      toneOfVoice: "EXPERT",
    }),
  });
  if (youtube.status === 200) {
    throw new Error("YouTube onboard должен быть отклонён");
  }
  console.log("youtube_rejected", youtube.status, youtube.body.error);

  const youtubeParse = await http<{ error?: string }>("/api/parse-profile", {
    method: "POST",
    body: JSON.stringify({ handle: "https://youtube.com/@linguamarina" }),
  });
  if (youtubeParse.status === 200) {
    throw new Error("YouTube parse-profile должен быть отклонён");
  }

  const started = await http<{ analysis?: Json; error?: string }>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (started.status !== 200 || !started.body.analysis) {
    throw new Error(`analyze failed: ${started.status} ${JSON.stringify(started.body)}`);
  }
  const analysisId = String(asRecord(started.body.analysis).id);
  console.log("queued", analysisId, asRecord(started.body.analysis).status);

  const terminal = new Set(["COMPLETED", "FAILED"]);
  const deadline = Date.now() + 180_000;
  let analysis: Json = asRecord(started.body.analysis);
  while (!terminal.has(String(analysis.status))) {
    if (Date.now() > deadline) {
      throw new Error(`timeout status=${analysis.status} id=${analysisId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const polled = await http<{ analysis?: Json; error?: string }>(
      `/api/analyze?id=${encodeURIComponent(analysisId)}`,
    );
    if (polled.status !== 200 || !polled.body.analysis) {
      throw new Error(`poll failed: ${polled.status} ${JSON.stringify(polled.body)}`);
    }
    analysis = asRecord(polled.body.analysis);
    console.log("status", analysis.status);
  }

  if (analysis.status !== "COMPLETED") {
    throw new Error(`analysis ${analysis.status}: ${analysis.errorMessage}`);
  }

  const scripts = Array.isArray(analysis.scripts) ? analysis.scripts : [];
  if (scripts.length < 3) {
    throw new Error(`expected 3 scripts (15/30/45), got ${scripts.length}`);
  }
  for (const raw of scripts) {
    const script = asRecord(raw);
    const text = String(script.teleprompterScript || "");
    if (text.trim().length < 48) {
      throw new Error(`empty teleprompter on ${script.title}`);
    }
    if (!/0\s*[–—-]\s*3/.test(text)) {
      throw new Error(`teleprompter missing hook clock: ${script.title}`);
    }
  }

  const rawProfile = asRecord(analysis.rawProfileData);
  const scrapeMode = rawProfile.scrapeMode;
  const live = scrapeMode === "live-run" || scrapeMode === "apify-reuse";
  if (EXPECT_LIVE && !live) {
    throw new Error("EXPECT_LIVE=true but scrapeMode is not live/reuse (mock cycle)");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        health: `${BASE_URL}/api/health`,
        analysisId,
        handle: analysis.socialHandle,
        platform: analysis.platform,
        scripts: scripts.length,
        scrapeMode: scrapeMode || "mock",
        live,
        teleprompterChars: scripts.map((item) =>
          String(asRecord(item).teleprompterScript || "").length,
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
