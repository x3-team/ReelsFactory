/**
 * Юридические реквизиты для лендинга / оферты.
 * Заполняются через NEXT_PUBLIC_LEGAL_* в .env (публичные, не секреты).
 */
export function legalEntity() {
  return {
    brand: "ReelsFactory",
    name:
      process.env.NEXT_PUBLIC_LEGAL_NAME ||
      "Индивидуальный предприниматель (реквизиты уточняются)",
    inn: process.env.NEXT_PUBLIC_LEGAL_INN || "—",
    ogrnip: process.env.NEXT_PUBLIC_LEGAL_OGRNIP || "",
    address:
      process.env.NEXT_PUBLIC_LEGAL_ADDRESS ||
      "Адрес для корреспонденции уточняется",
    email:
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
      "support@reelsfactory.app",
    siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://reelsfactory.app",
  };
}
