import type { AppLocale } from "@/lib/i18n/config";

type ListingStatusBannerProps = {
  availabilityStatus: string | null | undefined;
  locale?: AppLocale;
  compact?: boolean;
};

const UNDER_AGREEMENT_LABELS: Record<AppLocale, string> = {
  fr: "Sous Compromis",
  en: "Sale Agreed",
  es: "Venta Acordada",
  ru: "Под соглашением",
};

export const isListingUnderAgreement = (
  availabilityStatus: string | null | undefined
): boolean => {
  if (typeof availabilityStatus !== "string") return false;
  return availabilityStatus.trim().toLowerCase() === "agreement";
};

export function ListingStatusBanner({
  availabilityStatus,
  locale = "fr",
  compact = false,
}: ListingStatusBannerProps) {
  if (!isListingUnderAgreement(availabilityStatus)) {
    return null;
  }

  const label = UNDER_AGREEMENT_LABELS[locale] ?? UNDER_AGREEMENT_LABELS.fr;

  return (
    <div
      aria-label={label}
      className={`pointer-events-none absolute left-0 top-0 z-10 flex items-center justify-center bg-[#141446] text-[#f4ece4] uppercase tracking-[0.18em] shadow-[0_4px_12px_rgba(20,20,70,0.25)] ${
        compact
          ? "px-3 py-1 text-[11px]"
          : "px-5 py-2 text-xs md:text-sm"
      }`}
      style={{
        fontFamily:
          "var(--font-montserrat), var(--font-hk-grotesk), Arial, Helvetica, sans-serif",
        fontWeight: 600,
        borderBottomRightRadius: "0.75rem",
        borderTop: "3px solid #f4ece4",
        borderRight: "3px solid #f4ece4",
      }}
    >
      {label}
    </div>
  );
}
