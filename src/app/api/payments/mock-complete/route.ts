import { NextResponse } from "next/server";

import { fulfillSuccessfulPayment } from "@/lib/payments/fulfill";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/config";

/**
 * Demo-only helper that simulates a successful YooKassa redirect/webhook.
 * Enabled when payments were created in mock mode.
 */
export async function GET(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: paymentId },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await fulfillSuccessfulPayment(payment);

  return NextResponse.redirect(`${appUrl()}/?paid=1`);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { paymentId?: string };
  if (!body.paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: body.paymentId },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const result = await fulfillSuccessfulPayment(payment);
  return NextResponse.json(result);
}
