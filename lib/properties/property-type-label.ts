import type { AppLocale } from "@/lib/i18n/config";
import { formatPropertyTypeLabel as formatLocalizedPropertyTypeLabel } from "@/lib/i18n/domain";

export const formatPropertyTypeLabel = (
  value: string | null | undefined,
  locale: AppLocale = "fr"
) => {
  return formatLocalizedPropertyTypeLabel(value, locale);
};
