import Link from "next/link";
import type { ReactNode } from "react";

export type CtaVariant = "primary" | "secondary" | "tertiary" | "phone";

type BaseProps = {
  children: ReactNode;
  variant?: CtaVariant;
  className?: string;
  ariaLabel?: string;
  fullWidth?: boolean;
  /** Analytics: stable id pushed via the click delegate (`cta_clicked`). */
  trackId?: string;
  /** Analytics: e.g. "hero", "final_cta", "footer". */
  trackLocation?: string;
};

type LinkProps = BaseProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: never;
};

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141446]";

const VARIANT_CLASSES: Record<CtaVariant, string> = {
  primary: "bg-[#141446] text-[#f4ece4] hover:opacity-95 hover:-translate-y-[1px] shadow-sm",
  secondary:
    "border border-[#141446] bg-[#141446]/5 text-[#141446] hover:bg-[#141446]/10",
  tertiary:
    "border border-[#141446]/30 bg-transparent text-[#141446] hover:bg-[#141446]/5",
  phone:
    "border border-[#141446] bg-transparent text-[#141446] hover:bg-[#141446]/5",
};

function composeClassName(
  variant: CtaVariant,
  fullWidth: boolean,
  extra?: string
) {
  const classes = [BASE, VARIANT_CLASSES[variant]];
  if (fullWidth) classes.push("w-full sm:w-auto");
  if (extra) classes.push(extra);
  return classes.join(" ");
}

function resolveIsExternal(href: string) {
  return (
    href.startsWith("tel:") ||
    href.startsWith("mailto:") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("#")
  );
}

export function CtaButton({
  children,
  href,
  variant = "primary",
  className,
  ariaLabel,
  fullWidth = false,
  target,
  rel,
  trackId,
  trackLocation,
}: LinkProps) {
  const composed = composeClassName(variant, fullWidth, className);
  const analyticsAttrs = trackId
    ? { "data-track-cta": trackId, "data-track-location": trackLocation }
    : trackLocation
      ? { "data-track-location": trackLocation }
      : {};

  if (resolveIsExternal(href)) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={composed}
        target={target}
        rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
        {...analyticsAttrs}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={composed} {...analyticsAttrs}>
      {children}
    </Link>
  );
}

export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      <path d="M5 12h14" />
    </svg>
  );
}
