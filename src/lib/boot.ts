import { registerTelegramWebhook } from "@/lib/telegram/register-webhook";

/**
 * Long-lived Node boot: BullMQ worker + Telegram webhook.
 * Called from instrumentation.ts (Next.js server runtime).
 */
export async function bootProductionServices() {
  try {
    const { ensureQueueWorker } = await import("@/lib/queue/analysis-queue");
    await ensureQueueWorker();
  } catch (error) {
    console.warn(
      "Queue worker boot skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  if (process.env.NODE_ENV === "production" || process.env.REGISTER_TELEGRAM_WEBHOOK === "true") {
    try {
      const result = await registerTelegramWebhook();
      if (result.ok) {
        console.info("Telegram webhook registered:", result.url);
      }
    } catch (error) {
      console.warn(
        "Telegram webhook registration skipped:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}
