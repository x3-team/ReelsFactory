import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/config";
import { fulfillSuccessfulPayment } from "@/lib/payments/fulfill";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/config";

function mockPaymentsAllowed() {
  return (
    isMockMode() ||
    process.env.ALLOW_MOCK_PAYMENTS === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

function isMockedPayment(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { mocked?: boolean }).mocked === true;
}

export async function GET(request: Request) {
  if (!mockPaymentsAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paymentId = new URL(request.url).searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: paymentId },
  });

  if (!payment || !isMockedPayment(payment.metadata)) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await fulfillSuccessfulPayment(payment);
  return NextResponse.redirect(`${appUrl()}/app?paid=1`);
}

export async function POST(request: Request) {
  if (!mockPaymentsAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { paymentId?: string };
  if (!body.paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: body.paymentId },
  });
  if (!payment || !isMockedPayment(payment.metadata)) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const result = await fulfillSuccessfulPayment(payment);
  return NextResponse.json(result);
}
