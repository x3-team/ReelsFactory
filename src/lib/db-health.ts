import { prisma } from "@/lib/prisma";

export type DbHealth = {
  ok: boolean;
  db: "up" | "down";
};

/**
 * Liveness + DB reachability. Never include connection strings or secrets.
 */
export async function checkDbHealth(): Promise<DbHealth> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, db: "up" };
  } catch {
    return { ok: false, db: "down" };
  }
}
