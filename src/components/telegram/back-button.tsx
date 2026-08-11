"use client";

import { useEffect } from "react";
import { backButton } from "@telegram-apps/sdk-react";
import { useRouter } from "next/navigation";

/**
 * Shows Telegram native BackButton and navigates back on click.
 * Pass `show={false}` to hide (e.g. on the root screen).
 */
export function TelegramBackButton({ show = true }: { show?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!backButton.isSupported() || !backButton.isMounted()) {
      return;
    }

    if (!show) {
      backButton.hide();
      return;
    }

    backButton.show();
    const off = backButton.onClick(() => {
      router.back();
    });

    return () => {
      off();
      backButton.hide();
    };
  }, [show, router]);

  return null;
}
