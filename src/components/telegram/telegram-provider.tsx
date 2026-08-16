"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  initDataState,
  retrieveRawInitData,
  type User as TelegramUser,
  useSignal,
} from "@telegram-apps/sdk-react";

import { initTelegramApp } from "@/lib/telegram/init";

type TelegramContextValue = {
  ready: boolean;
  user: TelegramUser | undefined;
  startParam: string | undefined;
  isTelegram: boolean;
  rawInitData: string | undefined;
};

const TelegramContext = createContext<TelegramContextValue>({
  ready: false,
  user: undefined,
  startParam: undefined,
  isTelegram: false,
  rawInitData: undefined,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

function detectTelegramWebView() {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp ||
      window.location.hash.includes("tgWebAppData") ||
      window.location.search.includes("tgWebAppData"),
  );
}

/**
 * Telegram Mini App wrapper. SDK/theme CSS vars только внутри Telegram —
 * иначе веб-витрина получает чёрный фон от пустых --tg-theme-*.
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [rawInitData, setRawInitData] = useState<string | undefined>();
  const initData = useSignal(initDataState);

  useEffect(() => {
    const inTelegram = detectTelegramWebView();
    setIsTelegram(inTelegram);
    if (inTelegram) {
      document.body.classList.add("telegram-app");
      initTelegramApp();
      try {
        setRawInitData(retrieveRawInitData() || undefined);
      } catch {
        setRawInitData(undefined);
      }
    } else {
      document.body.classList.remove("telegram-app");
    }
    setReady(true);
    return () => {
      document.body.classList.remove("telegram-app");
    };
  }, []);

  const value = useMemo<TelegramContextValue>(
    () => ({
      ready,
      user: initData?.user,
      startParam: initData?.start_param,
      isTelegram,
      rawInitData,
    }),
    [ready, initData, isTelegram, rawInitData],
  );

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}
