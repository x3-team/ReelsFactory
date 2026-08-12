/** Slice by Unicode code points so we never split an emoji surrogate pair. */
export function sliceChars(text: string, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return Array.from(text).slice(0, max).join("");
}

export function sanitizeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v !== "string") return v;
      const cleaned = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
      return cleaned.replace(/[\uD800-\uDFFF]/g, "");
    }),
  ) as T;
}
