import packageJson from "../../package.json";

/** Semver продукта. Источник правды — `package.json` → "version". */
export const APP_VERSION = packageJson.version;

/** Для UI: v0.2.0 */
export function appVersionLabel(prefix = "v") {
  return `${prefix}${APP_VERSION}`;
}
