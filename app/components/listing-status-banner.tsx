import type { AppLocale } from "@/lib/i18n/config";

type ListingStatusBannerProps = {
  availabilityStatus: string | null | undefined;
  locale?: AppLocale;
  compact?: boolean;
};

type CommercialStatus = "agreement" | "option";

const STATUS_LABELS: Record<CommercialStatus, Record<AppLocale, string>> = {
  agreement: {
    fr: "Sous Compromis",
    en: "Sale Agreed",
    es: "Venta Acordada",
    ru: "Под соглашением",
  },
  option: {
    fr: "Sous Offre",
    en: "Under Offer",
    es: "Bajo Oferta",
    ru: "Под предложением",
  },
};

const normalizeAvailabilityStatus = (
  value: string | null | undefined
): CommercialStatus | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "agreement") return "agreement";
  if (normalized === "option") return "option";
  return null;
};

export const isListingUnderAgreement = (
  availabilityStatus: string | null | undefined
): boolean => normalizeAvailabilityStatus(availabilityStatus) === "agreement";

export const isListingUnderOffer = (
  availabilityStatus: string | null | undefined
): boolean => normalizeAvailabilityStatus(availabilityStatus) === "option";

export const getListingCommercialStatusLabel = (
  availabilityStatus: string | null | undefined,
  locale: AppLocale = "fr"
): string | null => {
  const status = normalizeAvailabilityStatus(availabilityStatus);
  if (!status) return null;
  return STATUS_LABELS[status][locale] ?? STATUS_LABELS[status].fr;
};

export function ListingStatusBanner({
  availabilityStatus,
  locale = "fr",
  compact = false,
}: ListingStatusBannerProps) {
  const label = getListingCommercialStatusLabel(availabilityStatus, locale);
  if (!label) {
    return null;
  }

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
