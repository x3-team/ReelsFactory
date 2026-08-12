import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  fulfillSuccessfulPayment,
  refundReservedCredit,
} from "@/lib/payments/fulfill";
import { verifyYooKassaWebhook } from "@/lib/payments/yookassa";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

type YooWebhook = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    amount?: { value?: string; currency?: string };
    metadata?: { userId?: string; plan?: string };
  };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as YooWebhook;
    const providerPaymentId = payload.object?.id;
    const verified = await verifyYooKassaWebhook(request, providerPaymentId);
    if (!verified.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!providerPaymentId) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { providerPaymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const live = verified.live;
    const status = live?.status || payload.object?.status;
    const event = payload.event;
    const webhookAmount = Number(live?.amount?.value ?? payload.object?.amount?.value);
    if (
      Number.isFinite(webhookAmount) &&
      Math.abs(webhookAmount - Number(payment.amount)) > 0.05
    ) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    const succeeded =
      event === "payment.succeeded" || status === "succeeded";
    const canceled =
      event === "payment.canceled" || status === "canceled";

    if (succeeded) {
      const result = await fulfillSuccessfulPayment(payment);
      return NextResponse.json(serialize(result));
    }

    if (canceled) {
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CANCELLED },
      });
      if (payment.status === PaymentStatus.PENDING) {
        await refundReservedCredit(payment);
      }
      return NextResponse.json(serialize({ payment: updated }));
    }

    return NextResponse.json(
      serialize({ payment, ignored: true, event, status }),
    );
  } catch (error) {
    console.error("POST /api/payments/webhook", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook handling failed",
      },
      { status: 500 },
    );
  }
}
