import { createHash, randomUUID } from "crypto";

import {
  appUrl,
  billingPeriodLabel,
  isMockMode,
  planPriceRub,
  PLANS,
  type BillingPeriod,
  type PlanId,
} from "@/lib/config";

export type YooKassaPayment = {
  id: string;
  status: string;
  confirmation?: { confirmation_url?: string; type?: string };
  amount: { value: string; currency: string };
  metadata?: Record<string, string>;
};

export async function createYooKassaPayment(input: {
  plan: Exclude<PlanId, "FREE">;
  billingPeriod?: BillingPeriod;
  userId: string;
  telegramId: string;
}): Promise<{ payment: YooKassaPayment; mocked: boolean }> {
  const period: BillingPeriod = input.billingPeriod || "month";
  const plan = PLANS[input.plan];
  const amountValue = planPriceRub(input.plan, period).toFixed(2);
  const periodRu = billingPeriodLabel(period);

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
          billingPeriod: period,
          telegramId: input.telegramId,
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
        return_url: `${appUrl()}/app?paid=1`,
      },
      description: `ReelsFactory — «${plan.name}» на ${periodRu}`,
      metadata: {
        userId: input.userId,
        plan: input.plan,
        billingPeriod: period,
        telegramId: input.telegramId,
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

export async function createYooKassaProductPayment(input: {
  productId: string;
  title: string;
  amountRub: number;
  userId: string;
  telegramId: string;
  extraMeta?: Record<string, string>;
}): Promise<{ payment: YooKassaPayment; mocked: boolean }> {
  const amountValue = input.amountRub.toFixed(2);

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
          product: input.productId,
          telegramId: input.telegramId,
          ...(input.extraMeta || {}),
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
        return_url: `${appUrl()}/app?paid=1`,
      },
      description: `ReelsFactory — ${input.title}`,
      metadata: {
        userId: input.userId,
        product: input.productId,
        telegramId: input.telegramId,
        ...(input.extraMeta || {}),
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

export function verifyYooKassaBasicAuth(header: string | null): boolean {
  const secret = process.env.YOOKASSA_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!header) return false;
  const hash = createHash("sha256").update(header).digest("hex");
  const expected = createHash("sha256").update(secret).digest("hex");
  return hash === expected;
}
