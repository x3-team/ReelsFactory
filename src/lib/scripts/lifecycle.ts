import { prisma } from "@/lib/prisma";

export type ScriptLifecycleAction = "shot" | "published" | "ready";

export function applyLifecycleTimestamps(
  action: ScriptLifecycleAction,
  now = new Date(),
): { shotAt: Date | null; publishedAt: Date | null } {
  if (action === "ready") {
    return { shotAt: null, publishedAt: null };
  }
  if (action === "shot") {
    return { shotAt: now, publishedAt: null };
  }
  return { shotAt: now, publishedAt: now };
}

export async function updateScriptLifecycle(input: {
  userId: string;
  scriptId: string;
  action: ScriptLifecycleAction;
}) {
  const script = await prisma.script.findFirst({
    where: { id: input.scriptId, userId: input.userId },
  });
  if (!script) {
    throw new Error("Сценарий не найден");
  }
  if (script.isTeaser) {
    throw new Error("Этот суфлёр закрыт — сначала откройте тариф");
  }

  const data = applyLifecycleTimestamps(input.action);
  return prisma.script.update({
    where: { id: script.id },
    data,
  });
}
