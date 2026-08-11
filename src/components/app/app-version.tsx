import { appVersionLabel } from "@/lib/version";
import { cn } from "@/lib/utils";

export function AppVersion({
  className,
  tone = "muted",
}: {
  className?: string;
  tone?: "muted" | "light";
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        tone === "light" ? "text-white/40" : "text-muted-foreground",
        className,
      )}
      title="Версия сервиса"
    >
      {appVersionLabel()}
    </span>
  );
}
