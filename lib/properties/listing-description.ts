import type { AppLocale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { fromCents } from "@/lib/properties/money";
import type { PropertyPriceSnapshot } from "@/types/domain/properties";

/**
 * SweepBright descriptions are free text typed by the advisor, and they often
 * restate the tenant fees. That figure is computed on the unrounded legal caps
 * and rounded once, whereas the payload carries components already rounded to
 * the cent — the two totals can differ by a cent and appear side by side on
 * the same page.
 *
 * The price model is the single source of truth for the page, so the amount
 * stated right after a tenant-fee label is realigned on it. Only that number
 * is rewritten: the surrounding prose, and any description that states no
 * amount, are left untouched.
 */
// Capture 1 is the fee label up to (and including) any currency symbol; capture
// 2 is the amount itself, the only fragment ever rewritten.
const TENANT_FEE_TOTAL_PATTERNS: Record<AppLocale, RegExp[]> = {
  fr: [/(honoraires[^\n]{0,80}?locataire[^\d\n]{0,25})(\d{1,3}(?:[  \u00a0.]\d{3})*(?:,\d{1,2})?)/gi],
  en: [/((?:tenant|rental)\s+fees?[^\d\n]{0,40})(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi],
  es: [/(honorarios[^\n]{0,80}?inquilino[^\d\n]{0,25})(\d{1,3}(?:[  \u00a0.]\d{3})*(?:,\d{1,2})?)/gi],
  ru: [/(комисси[^\n]{0,80}?арендатор[^\d\n]{0,25})(\d{1,3}(?:[  \u00a0]\d{3})*(?:,\d{1,2})?)/gi],
};

export const normalizeListingDescriptionFees = (input: {
  description: string | null;
  price: PropertyPriceSnapshot;
  locale: AppLocale;
}): string | null => {
  const { description, price, locale } = input;
  if (!description || price.kind !== "rental") return description;
  if (typeof price.totalTenantFeesCents !== "number") return description;

  const canonical = formatNumber(fromCents(price.totalTenantFeesCents), locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return TENANT_FEE_TOTAL_PATTERNS[locale].reduce((text, pattern) => {
    return text.replace(pattern, (_match, label: string) => `${label}${canonical}`);
  }, description);
};
