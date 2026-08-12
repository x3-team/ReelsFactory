import { ReelsFactoryApp } from "@/components/app/reels-factory-app";
import { TelegramProvider } from "@/components/telegram/telegram-provider";

export default function AppPage() {
  return (
    <TelegramProvider>
      <ReelsFactoryApp />
    </TelegramProvider>
  );
}
