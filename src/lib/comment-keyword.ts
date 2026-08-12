import { prisma } from "@/lib/prisma";

export function normalizeKeyword(raw: string | undefined | null, fallback = "ХУК") {
  const cleaned = (raw || "")
    .replace(/[«»"']/g, "")
    .replace(/^комментируй(те)?\s*/i, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁ0-9]/gi, "");
  return cleaned.slice(0, 16) || fallback;
}

const HUMAN_KEYWORDS = [
  "РЕЦЕПТ",
  "УРОК",
  "ТК",
  "ГАЙД",
  "ЛИСТ",
  "СТАРТ",
  "ШПАРГАЛКА",
];

/**
 * Keep comment→bot keywords unique across *other* authors so the webhook
 * does not send the wrong lead magnet.
 */
export async function allocateCommentKeyword(
  raw: string | null | undefined,
  userId: string,
  takenInBatch: Set<string> = new Set(),
): Promise<string> {
  const base = normalizeKeyword(raw, "ХУК");
  let candidate = base;

  for (let n = 0; n < 24; n += 1) {
    const key = candidate.toLowerCase();
    if (!takenInBatch.has(key)) {
      const clash = await prisma.script.findFirst({
        where: {
          commentKeyword: { equals: candidate, mode: "insensitive" },
          NOT: { userId },
        },
        select: { id: true },
      });
      if (!clash) {
        takenInBatch.add(key);
        return candidate;
      }
    }
    const suffix = String(n + 2);
    candidate = `${base.slice(0, Math.max(1, 16 - suffix.length))}${suffix}`;
  }

  const uniq = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "X";
  const last = `${base.slice(0, Math.max(1, 16 - uniq.length))}${uniq}`.slice(0, 16);
  takenInBatch.add(last.toLowerCase());
  return last;
}

/**
 * One human word for the whole analysis. Never appends 2/3 —
 * those look broken in a comment CTA.
 */
export async function allocateSharedKeyword(
  raw: string | null | undefined,
  userId: string,
): Promise<string> {
  const preferred = normalizeKeyword(raw, "").replace(/\d+$/, "");
  const candidates = [preferred, ...HUMAN_KEYWORDS].filter(Boolean);
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const key = candidate.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const clash = await prisma.script.findFirst({
      where: {
        commentKeyword: { equals: key, mode: "insensitive" },
        NOT: { userId },
      },
      select: { id: true },
    });
    if (!clash) return key;
  }

  return preferred || "ГАЙД";
}
