import { Clapperboard } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box =
    size === "lg" ? "size-14" : size === "sm" ? "size-9" : "size-11";
  const icon = size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)]",
        box,
        className,
      )}
    >
      <Clapperboard className={icon} />
    </div>
  );
}
