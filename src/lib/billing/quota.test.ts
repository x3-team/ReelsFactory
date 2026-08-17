import assert from "node:assert/strict";
import { test } from "node:test";

import { PLANS, livePaymentsConfigured, mockPaymentsAllowed, paymentsEnabled } from "@/lib/config";
import { QuotaError } from "@/lib/billing/quota";
import { createYooKassaPayment } from "@/lib/payments/yookassa";
import { PAYMENTS_UNAVAILABLE_MESSAGE } from "@/lib/config";

test("Start/Pro are for sale; Agency is not; copy does not promise competitors", () => {
  assert.equal(PLANS.START.forSale, true);
  assert.equal(PLANS.PRO.forSale, true);
  assert.equal(PLANS.AGENCY.forSale, false);
  assert.equal(PLANS.START.packsPerMonth, 4);
  assert.equal(PLANS.PRO.packsPerMonth, 10);
  assert.equal(PLANS.FREE.packsPerMonth, 1);
  assert.doesNotMatch(PLANS.PRO.description, /конкурент/i);
  assert.match(PLANS.AGENCY.description, /не продаём/i);
});

test("QuotaError is a 402 with a human Russian message", () => {
  const error = new QuotaError({
    packsUsed: 1,
    packsLimit: 1,
    planName: "Бесплатно",
  });
  assert.equal(error.statusCode, 402);
  assert.match(error.message, /лимит/);
  assert.match(error.message, /Старт/);
});

test("paymentsEnabled is true in non-production even without YooKassa", () => {
  assert.equal(mockPaymentsAllowed(), process.env.NODE_ENV !== "production");
  if (process.env.NODE_ENV !== "production") {
    assert.equal(paymentsEnabled(), true);
  }
  assert.equal(typeof livePaymentsConfigured(), "boolean");
});

test("production without YooKassa keys refuses mock checkout", async () => {
  const prevNode = process.env.NODE_ENV;
  const prevShop = process.env.YOOKASSA_SHOP_ID;
  const prevSecret = process.env.YOOKASSA_SECRET_KEY;
  const prevMock = process.env.MOCK_EXTERNAL_APIS;
  process.env.NODE_ENV = "production";
  process.env.MOCK_EXTERNAL_APIS = "true";
  delete process.env.YOOKASSA_SHOP_ID;
  delete process.env.YOOKASSA_SECRET_KEY;
  try {
    await assert.rejects(
      () =>
        createYooKassaPayment({
          plan: "START",
          userId: "user_1",
          telegramId: "1",
        }),
      (error: Error) => error.message === PAYMENTS_UNAVAILABLE_MESSAGE,
    );
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevShop === undefined) delete process.env.YOOKASSA_SHOP_ID;
    else process.env.YOOKASSA_SHOP_ID = prevShop;
    if (prevSecret === undefined) delete process.env.YOOKASSA_SECRET_KEY;
    else process.env.YOOKASSA_SECRET_KEY = prevSecret;
    if (prevMock === undefined) delete process.env.MOCK_EXTERNAL_APIS;
    else process.env.MOCK_EXTERNAL_APIS = prevMock;
  }
});
