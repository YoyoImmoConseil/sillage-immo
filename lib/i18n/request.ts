import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, type AppLocale, isSupportedLocale } from "./config";

export const getRequestLocale = async (): Promise<AppLocale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("sillage-locale")?.value;
  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  const headerLocale = headerStore.get("x-sillage-locale");
  return isSupportedLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;
};
