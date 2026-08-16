import type { AppScript } from "@/lib/client-api";

export const SCRIPT_LENGTHS = [15, 30, 45] as const;
export type ScriptLength = (typeof SCRIPT_LENGTHS)[number];

export function scriptDuration(
  script: Pick<AppScript, "format" | "title"> | { format?: string; title?: string },
  index: number,
): ScriptLength {
  const blob = `${script.format || ""} ${script.title || ""}`;
  const match = blob.match(/\b(15|30|45)\b/);
  if (match) {
    const value = Number(match[1]) as ScriptLength;
    if (SCRIPT_LENGTHS.includes(value)) return value;
  }
  return SCRIPT_LENGTHS[index] ?? 30;
}
