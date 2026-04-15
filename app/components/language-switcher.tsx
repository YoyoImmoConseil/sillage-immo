"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";
import { getPathLocale, localizePathWithSearch, stripLocalePrefix } from "@/lib/i18n/routing";

const LOCALE_NAMES: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  ru: "Русский",
};

type LanguageSwitcherProps = {
  theme?: "dark" | "light";
};

export function LanguageSwitcher({ theme = "dark" }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const locale = getPathLocale(pathname);
  const basePath = stripLocalePrefix(pathname);
  const search = searchParams.toString();

  return (
    <label className="text-xs uppercase tracking-[0.14em]">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as AppLocale;
          router.push(localizePathWithSearch(basePath, nextLocale, search));
        }}
        className={
          theme === "dark"
            ? "rounded border border-white/16 bg-[#141446] px-3 py-2 text-[#f4ece4]"
            : "rounded border border-[#141446]/16 bg-white px-3 py-2 text-[#141446]"
        }
        aria-label="Select language"
      >
        {SUPPORTED_LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_LABELS[option]} · {LOCALE_NAMES[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
