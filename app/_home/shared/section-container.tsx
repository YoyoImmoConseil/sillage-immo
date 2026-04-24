import type { ReactNode } from "react";

type Props = {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "light" | "soft" | "plain";
  padding?: "default" | "compact" | "hero";
  ariaLabelledBy?: string;
};

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  light: "sillage-section-light",
  soft: "sillage-section-soft",
  plain: "sillage-section-plain",
};

const PADDING_CLASSES: Record<NonNullable<Props["padding"]>, string> = {
  default: "px-6 py-14 md:px-10 md:py-20 xl:px-14 2xl:px-20",
  compact: "px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20",
  hero: "px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20",
};

export function SectionContainer({
  id,
  children,
  className,
  tone = "light",
  padding = "default",
  ariaLabelledBy,
}: Props) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={`${TONE_CLASSES[tone]} ${className ?? ""}`}
    >
      <div className={`w-full ${PADDING_CLASSES[padding]}`}>{children}</div>
    </section>
  );
}
