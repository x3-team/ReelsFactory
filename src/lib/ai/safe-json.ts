/** Slice by Unicode code points so we never split an emoji surrogate pair. */
export function sliceChars(text: string, max: number) {
  if (!text) return "";
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return chars.slice(0, max).join("");
}

/** Same as sliceChars, but never cut in the middle of a word. */
export function sliceWords(text: string, max: number) {
  const cut = sliceChars(text.trim(), max).trim();
  if (Array.from(text.trim()).length <= max) return text.trim();
  const spaced = cut.replace(/\s+\S*$/, "").trim();
  return spaced.length >= 12 ? spaced : cut;
}

export function stripLoneSurrogates(text: string) {
  return Array.from(text)
    .filter((ch) => {
      const code = ch.codePointAt(0) || 0;
      return code < 0xd800 || code > 0xdfff;
    })
    .join("")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

export function sanitizeForJson<T>(value: T): T {
  if (typeof value === "string") return stripLoneSurrogates(value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForJson(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeForJson(nested);
    }
    return out as T;
  }
  return value;
}
