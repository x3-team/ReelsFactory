import { randomUUID, timingSafeEqual } from "crypto";

import { appUrl, isMockMode, PLANS, type PlanId } from "@/lib/config";

export type YooKassaPayment = {
  id: string;
  status: string;
  confirmation?: { confirmation_url?: string; type?: string };
  amount: { value: string; currency: string };
  metadata?: Record<string, string>;
};

export async function createYooKassaPayment(input: {
  plan: Exclude<PlanId, "FREE">;
  userId: string;
  telegramId: string;
}): Promise<{ payment: YooKassaPayment; mocked: boolean }> {
  const plan = PLANS[input.plan];
  const amountValue = plan.priceRub.toFixed(2);

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
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
