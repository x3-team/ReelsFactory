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
  type User as TelegramUser,
  useSignal,
} from "@telegram-apps/sdk-react";

import { initTelegramApp } from "@/lib/telegram/init";

type TelegramContextValue = {
  ready: boolean;
  user: TelegramUser | undefined;
  startParam: string | undefined;
  isTelegram: boolean;
};

const TelegramContext = createContext<TelegramContextValue>({
  ready: false,
  user: undefined,
  startParam: undefined,
  isTelegram: false,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

/**
 * Client-only Telegram Mini App wrapper.
 * Initializes SDK (viewport, theme CSS vars, BackButton) and exposes initData.
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const initData = useSignal(initDataState);

  useEffect(() => {
    initTelegramApp();
    const inTelegram =
      typeof window !== "undefined" &&
      Boolean(
        // Classic WebApp inject or launch params in hash/query
        (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram
          ?.WebApp ||
          window.location.hash.includes("tgWebAppData") ||
          window.location.search.includes("tgWebAppData"),
      );
    setIsTelegram(inTelegram);
    setReady(true);
  }, []);

  const value = useMemo<TelegramContextValue>(
    () => ({
      ready,
      user: initData?.user,
      startParam: initData?.start_param,
      isTelegram,
    }),
    [ready, initData, isTelegram],
  );

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}
