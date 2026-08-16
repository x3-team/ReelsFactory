/**
 * When Apify refuses a new actor run (monthly hard limit), we may still
 * read an already-paid SUCCEEDED dataset for the same handle.
 * That is reuse, not a mock and not a new scrape.
 */

export function isApifyHardLimitBody(status: number, body: string) {
  const code = Number(status);
  if (code !== 402 && code !== 403) return false;
  const text = (body || "").toLowerCase();
  return (
    text.includes("monthly usage hard limit") ||
    text.includes("platform-feature-disabled") ||
    text.includes("maxmonthlyusage") ||
    text.includes("hard limit")
  );
}

/** Production gate: 403/402 → reuse last SUCCEEDED dataset, not a mock profile. */
export function shouldAttemptApifyReuse(status: number, body: string) {
  const code = Number(status);
  if (code === 403 || code === 402) return true;
  return isApifyHardLimitBody(code, body);
}

export function bareApifyHandle(input: string) {
  return (input || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?/i, "")
    .replace(/^(instagram|tiktok)\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

export function handleFromApifyInput(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const rec = input as Record<string, unknown>;
  const first = (value: unknown): string | null => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) {
      const item = value[0];
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        for (const key of ["url", "username", "user", "handle"]) {
          if (typeof row[key] === "string" && row[key].trim()) {
            return String(row[key]).trim();
          }
        }
      }
    }
    return null;
  };
  for (const key of [
    "usernames",
    "profiles",
    "directUrls",
    "startUrls",
    "handles",
    "username",
    "handle",
    "profile",
  ]) {
    const hit = first(rec[key]);
    if (hit) return hit;
  }
  return null;
}

export function apifyInputMentionsHandle(input: unknown, handle: string) {
  const want = bareApifyHandle(handle);
  if (!want) return false;
  const blobs: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") blobs.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  };
  walk(input);
  return blobs.some((item) => bareApifyHandle(item) === want);
}
