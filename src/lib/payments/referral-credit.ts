export const YOOKASSA_MIN_RUB = 1;
export const REFERRAL_MIN_PAYOUT_RUB = 500;

export function computeReferralCredit(
  planPriceRub: number,
  balanceRub: number,
) {
  const price = Math.max(0, Number(planPriceRub) || 0);
  const balance = Math.max(0, Number(balanceRub) || 0);
  if (balance <= 0 || price <= 0) {
    return { credit: 0, charge: price, fullyCovered: false };
  }
  if (balance >= price) {
    return { credit: price, charge: 0, fullyCovered: true };
  }
  const credit = Math.min(balance, Math.max(0, price - YOOKASSA_MIN_RUB));
  return {
    credit,
    charge: Math.round((price - credit) * 100) / 100,
    fullyCovered: false,
  };
}
