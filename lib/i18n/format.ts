import { INTL_LOCALES, type AppLocale } from "./config";

export const formatDate = (
  value: string | Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions
) => {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], options).format(new Date(value));
};

export const formatDateTime = (
  value: string | Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions
) => {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(value));
};

export const formatNumber = (value: number, locale: AppLocale, options?: Intl.NumberFormatOptions) => {
  return new Intl.NumberFormat(INTL_LOCALES[locale], options).format(value);
};

export const formatCurrency = (
  value: number,
  locale: AppLocale,
  currency = "EUR",
  options?: Intl.NumberFormatOptions
) => {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
};
