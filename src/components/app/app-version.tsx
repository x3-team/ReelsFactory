import { cn } from "@/lib/utils";
import { appVersionLabel } from "@/lib/version";

/** Версия сборки в углу экрана — чтобы в поддержке сразу понимать, что у человека. */
export function AppVersion({ className }: { className?: string }) {
  return (
    <span
      title="Версия сервиса"
      className={cn("tabular-nums text-[11px] text-muted-foreground", className)}
    >
      {appVersionLabel()}
    </span>
  );
}
