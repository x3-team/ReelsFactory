import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { fulfillSuccessfulPayment } from "@/lib/payments/fulfill";
import { verifyYooKassaBasicAuth } from "@/lib/payments/yookassa";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

type YooWebhook = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: { userId?: string; plan?: string };
  };
};

export async function POST(request: Request) {
  try {
    if (!verifyYooKassaBasicAuth(request.headers.get("x-webhook-secret"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as YooWebhook;
    const providerPaymentId = payload.object?.id;
    const status = payload.object?.status;
    const event = payload.event;

    if (!providerPaymentId) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { providerPaymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
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
