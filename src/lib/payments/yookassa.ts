import { randomUUID, timingSafeEqual } from "crypto";

import { appUrl, isMockMode, PLANS, type PlanId } from "@/lib/config";

export type YooKassaPayment = {
  id: string;
  status: string;
  confirmation?: { confirmation_url?: string; type?: string };
  amount: { value: string; currency: string };
  metadata?: Record<string, string>;
};

function timingSafeString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function createYooKassaPayment(input: {
  plan: Exclude<PlanId, "FREE">;
  userId: string;
  telegramId: string;
  amountRub?: number;
  creditApplied?: number;
}): Promise<{ payment: YooKassaPayment; mocked: boolean }> {
  const plan = PLANS[input.plan];
  const amountValue = (input.amountRub ?? plan.priceRub).toFixed(2);

  if (
    isMockMode() ||
    !process.env.YOOKASSA_SHOP_ID ||
    !process.env.YOOKASSA_SECRET_KEY
  ) {
    const id = `mock_${randomUUID()}`;
    return {
      mocked: true,
      payment: {
        id,
        status: "pending",
        amount: { value: amountValue, currency: "RUB" },
        confirmation: {
          type: "redirect",
          confirmation_url: `${appUrl()}/api/payments/mock-complete?paymentId=${id}`,
        },
        metadata: {
          userId: input.userId,
          plan: input.plan,
          telegramId: input.telegramId,
          creditApplied: String(input.creditApplied || 0),
        },
      },
    };
  }

  const auth = Buffer.from(
    `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`,
  ).toString("base64");

  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotence-Key": randomUUID(),
    },
    body: JSON.stringify({
      amount: { value: amountValue, currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: `${appUrl()}/?paid=1`,
      },
      description: `ReelsFactory — тариф «${plan.name}»`,
      metadata: {
        userId: input.userId,
        plan: input.plan,
        telegramId: input.telegramId,
        creditApplied: String(input.creditApplied || 0),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YooKassa create failed: ${text}`);
  }

  const payment = (await res.json()) as YooKassaPayment;
  return { payment, mocked: false };
}

function shopAuthHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const shopSecret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !shopSecret) return null;
  return `Basic ${Buffer.from(`${shopId}:${shopSecret}`).toString("base64")}`;
}

export async function fetchYooKassaPayment(
  id: string,
): Promise<YooKassaPayment | null> {
  const auth = shopAuthHeader();
  if (!auth) return null;
  const res = await fetch(`https://api.yookassa.ru/v3/payments/${id}`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as YooKassaPayment;
}

function secretFromRequest(request: Request) {
  const header =
    request.headers.get("x-webhook-secret") ||
    new URL(request.url).searchParams.get("secret") ||
    "";
  return header;
}

function secretMatches(request: Request) {
  const webhookSecret = process.env.YOOKASSA_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  const got = secretFromRequest(request);
  return Boolean(got) && timingSafeString(got, webhookSecret);
}

function basicMatches(request: Request) {
  const expected = shopAuthHeader();
  const authorization = request.headers.get("authorization");
  if (!expected || !authorization?.toLowerCase().startsWith("basic ")) return false;
  const got = `Basic ${authorization.slice(6).trim()}`;
  return timingSafeString(got, expected);
}

/**
 * YooKassa POSTs JSON without a signature. Trust:
 * 1) optional URL/header secret, or
 * 2) live GET /v3/payments/{id} with shop credentials (source of truth).
 * Production is fail-closed.
 */
export async function verifyYooKassaWebhook(
  request: Request,
  providerPaymentId?: string | null,
): Promise<{ ok: boolean; live?: YooKassaPayment | null }> {
  if (providerPaymentId?.startsWith("mock_")) {
    return { ok: process.env.NODE_ENV !== "production" || isMockMode() };
  }

  if (secretMatches(request) || basicMatches(request)) {
    const live = providerPaymentId
      ? await fetchYooKassaPayment(providerPaymentId)
      : null;
    return { ok: true, live };
  }

  if (providerPaymentId && shopAuthHeader()) {
    const live = await fetchYooKassaPayment(providerPaymentId);
    if (live) return { ok: true, live };
  }

  if (process.env.NODE_ENV === "production") {
    return { ok: false };
  }
  return { ok: !process.env.YOOKASSA_WEBHOOK_SECRET && !process.env.YOOKASSA_SECRET_KEY };
}

/** Custom header secret and/or HTTP Basic shopId:secretKey (YooKassa cabinet). */
export function verifyYooKassaRequest(request: Request): boolean {
  if (secretMatches(request) || basicMatches(request)) return true;
  if (process.env.NODE_ENV === "production") return false;
  return !process.env.YOOKASSA_WEBHOOK_SECRET && !process.env.YOOKASSA_SECRET_KEY;
}

/** @deprecated use verifyYooKassaWebhook */
export function verifyYooKassaBasicAuth(header: string | null): boolean {
  const secret = process.env.YOOKASSA_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!header) return false;
  return timingSafeString(header, secret);
}
