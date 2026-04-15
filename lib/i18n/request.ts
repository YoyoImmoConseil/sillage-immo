import { headers } from "next/headers";
import { DEFAULT_LOCALE, type AppLocale, isSupportedLocale } from "./config";

export const getRequestLocale = async (): Promise<AppLocale> => {
  const headerStore = await headers();
  const headerLocale = headerStore.get("x-sillage-locale");
  return isSupportedLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;
};
