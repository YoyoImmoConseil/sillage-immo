import { DEFAULT_LOCALE, type AppLocale, isSupportedLocale } from "./config";

const ensureLeadingSlash = (value: string) => {
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
};

export const getPathLocale = (pathname: string): AppLocale => {
  const normalized = ensureLeadingSlash(pathname);
  const [, maybeLocale] = normalized.split("/");
  return isSupportedLocale(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;
};

export const stripLocalePrefix = (pathname: string) => {
  const normalized = ensureLeadingSlash(pathname);
  const segments = normalized.split("/");
  const maybeLocale = segments[1];

  if (!isSupportedLocale(maybeLocale) || maybeLocale === DEFAULT_LOCALE) {
    return normalized;
  }

  const stripped = `/${segments.slice(2).join("/")}`.replace(/\/+/g, "/");
  return stripped === "/" ? stripped : stripped.replace(/\/$/, "") || "/";
};

export const localizePath = (pathname: string, locale: AppLocale) => {
  const normalized = stripLocalePrefix(ensureLeadingSlash(pathname));
  if (locale === DEFAULT_LOCALE) {
    return normalized;
  }
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
};

export const localizePathWithSearch = (
  pathname: string,
  locale: AppLocale,
  search?: string | null
) => {
  const basePath = localizePath(pathname, locale);
  if (!search) return basePath;
  const normalizedSearch = search.startsWith("?") ? search : `?${search}`;
  return `${basePath}${normalizedSearch}`;
};
