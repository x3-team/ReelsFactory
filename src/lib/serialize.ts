/** JSON-safe serialization for Prisma BigInt / Decimal values */
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v && typeof v === "object") {
        const maybeDecimal = v as {
          toNumber?: () => number;
          toFixed?: () => string;
          d?: unknown[];
          e?: number;
          s?: number;
        };
        // Prisma Decimal (decimal.js) exposes toNumber / toFixed
        if (typeof maybeDecimal.toNumber === "function") {
          return maybeDecimal.toNumber();
        }
      }
      return v;
    }),
  ) as T;
}
