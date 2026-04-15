export const SUPPORTED_LOCALES = ["fr", "en", "es", "ru"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "fr";

export const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE
) as Exclude<AppLocale, typeof DEFAULT_LOCALE>[];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  fr: "FR",
  en: "EN",
  es: "ES",
  ru: "RU",
};

export const INTL_LOCALES: Record<AppLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  ru: "ru-RU",
};

export const isSupportedLocale = (value: string | null | undefined): value is AppLocale =>
  typeof value === "string" && SUPPORTED_LOCALES.includes(value as AppLocale);
