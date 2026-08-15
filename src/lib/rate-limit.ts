import IORedis from "ioredis";

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();
let redis: IORedis | null = null;

function redisUrl() {
  return process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || "";
}

function getRedis() {
  if (!redis) {
    redis = new IORedis(redisUrl(), {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redis.on("error", (err) => {
      console.error("Rate-limit Redis error:", err.message);
    });
  }
  return redis;
}

async function hitRedis(key: string, max: number, windowSec: number) {
  const client = getRedis();
  try {
    if (client.status === "wait") await client.connect();
    const n = await client.incr(key);
    if (n === 1) await client.expire(key, windowSec);
    return n <= max;
  } catch {
    return hitMemory(key, max, windowSec);
  }
}

function hitMemory(key: string, max: number, windowSec: number) {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

export async function rateLimit(input: {
  name: string;
  id: string;
  max: number;
  windowSec: number;
}) {
  const key = `rl:${input.name}:${input.id}`;
  if (redisUrl()) {
    return hitRedis(key, input.max, input.windowSec);
  }
  return hitMemory(key, input.max, input.windowSec);
}

export async function assertRateLimit(input: {
  name: string;
  id: string;
  max: number;
  windowSec: number;
}) {
  const ok = await rateLimit(input);
  if (!ok) {
    const error = new Error("Слишком много запросов. Подождите минуту.");
    (error as Error & { status?: number }).status = 429;
    throw error;
  }
}

export function httpErrorStatus(error: unknown, fallback = 500) {
  const status = (error as { status?: number } | null)?.status;
  if (status === 429) return 429;
  return fallback;
}
