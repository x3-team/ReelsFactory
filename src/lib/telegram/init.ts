import {
  backButton,
  init as initSdk,
  initData,
  miniApp,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

/**
 * Initialize Telegram Mini App SDK: viewport, theme CSS vars, BackButton.
 * Safe to call only in the browser. Outside Telegram, failures are swallowed
 * so local `pnpm dev` still works.
 */
export function initTelegramApp(): void {
  if (typeof window === "undefined") return;

  try {
    initSdk();
  } catch {
    // Already initialized or not in Telegram WebView
    return;
  }

  try {
    if (backButton.isSupported() && !backButton.isMounted()) {
      backButton.mount();
    }
  } catch {
    // ignore
  }

  try {
    initData.restore();
  } catch {
    // ignore
  }

  try {
    if (miniApp.mountSync.isAvailable()) {
      miniApp.mountSync();
    } else if (miniApp.mount.isAvailable()) {
      void miniApp.mount();
    }
    if (miniApp.bindCssVars.isAvailable()) {
      miniApp.bindCssVars();
    }
  } catch {
    // ignore
  }

  try {
    if (themeParams.mountSync.isAvailable()) {
      themeParams.mountSync();
    } else if (themeParams.mount.isAvailable()) {
      void themeParams.mount();
    }
    if (themeParams.bindCssVars.isAvailable()) {
      themeParams.bindCssVars();
    }
  } catch {
    // ignore
  }

  try {
    if (viewport.mount.isAvailable()) {
      void viewport.mount().then(() => {
        if (viewport.bindCssVars.isAvailable()) {
          viewport.bindCssVars();
        }
        if (viewport.expand.isAvailable()) {
          viewport.expand();
        }
      });
    }
  } catch {
    // ignore
  }

  try {
    if (miniApp.ready.isAvailable()) {
      miniApp.ready();
    }
  } catch {
    // ignore
  }
}
