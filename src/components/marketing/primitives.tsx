import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Section({
  id,
  className,
  children,
  tone = "cream",
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  tone?: "cream" | "ink" | "clay";
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28",
        tone === "cream" && "bg-cream text-ink",
        tone === "clay" && "bg-clay text-ink",
        tone === "ink" && "bg-ink text-cream",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1160px]">{children}</div>
    </section>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("type-eyebrow text-primary", className)}>{children}</p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "ink",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  tone?: "ink" | "cream";
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
      )}
    >
      {eyebrow ? (
        <Eyebrow className={tone === "cream" ? "text-signal" : undefined}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2 className="type-h2 font-display text-balance-ru max-w-[18ch]">
        {title}
      </h2>
      {lead ? (
        <p
          className={cn(
            "type-lead max-w-[56ch]",
            tone === "cream" ? "text-cream/70" : "text-ink/65",
          )}
        >
          {lead}
        </p>
      ) : null}
    </header>
  );
}

type ButtonTone = "ink" | "terracotta" | "outline" | "cream";

const toneClasses: Record<ButtonTone, string> = {
  ink: "bg-ink text-cream hover:bg-ink/88",
  terracotta: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-ink/20 bg-transparent text-ink hover:border-ink/45",
  cream: "bg-cream text-ink hover:bg-cream/88",
};

export function CtaLink({
  href,
  tone = "ink",
  size = "lg",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & {
  tone?: ButtonTone;
  size?: "lg" | "sm";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        size === "lg" ? "h-14 px-7 text-[1.02rem]" : "h-11 px-5 text-sm",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream/70 px-3.5 py-1.5 text-[0.82rem] font-medium text-ink/75",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full bg-primary animate-pulse-dot",
        className,
      )}
      aria-hidden
    />
  );
}
