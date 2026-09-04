import type { Metadata } from "next";
import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";

/**
 * Métadonnées SEO partagées : URL canonique, versions linguistiques (hreflang)
 * et valeurs Open Graph par défaut. Toutes les pages publiques passent par ici
 * pour que Google, WhatsApp, LinkedIn… voient la même identité.
 */

export const SITE_NAME = "Sillage Immo";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const SITE_URL = stripTrailingSlash(
  process.env.PUBLIC_SITE_URL?.trim() || "https://sillage-immo.com"
);

export const OG_LOCALES: Record<AppLocale, string> = {
  fr: "fr_FR",
  en: "en_US",
  es: "es_ES",
  ru: "ru_RU",
};

/**
 * `alternates` Next.js pour un chemin non localisé (ex. "/vente") :
 * canonique dans la langue courante + hreflang vers les 4 langues + x-default.
 */
export const buildAlternates = (
  path: string,
  locale: AppLocale
): NonNullable<Metadata["alternates"]> => {
  const languages: Record<string, string> = {};
  for (const candidate of SUPPORTED_LOCALES) {
    languages[candidate] = `${SITE_URL}${localizePath(path, candidate)}`;
  }
  languages["x-default"] = `${SITE_URL}${localizePath(path, "fr")}`;
  return {
    canonical: `${SITE_URL}${localizePath(path, locale)}`,
    languages,
  };
};

type PublicPageMetadataInput = {
  path: string;
  locale: AppLocale;
  title: string;
  description: string;
  /** Image Open Graph absolue ; par défaut l'image de marque générée. */
  image?: string | null;
  /** `noindex` pour les pages privées ou transactionnelles. */
  noIndex?: boolean;
};

/** Métadonnées complètes d'une page publique (titre, description, canonique, hreflang, OG, Twitter). */
export const buildPublicPageMetadata = ({
  path,
  locale,
  title,
  description,
  image,
  noIndex = false,
}: PublicPageMetadataInput): Metadata => {
  const alternates = buildAlternates(path, locale);
  const url = alternates.canonical as string;
  const images = image ? [{ url: image }] : undefined; // undefined → opengraph-image.tsx du layout
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALES[locale],
      url,
      title,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images: images.map((entry) => entry.url) } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
};

/** Nettoie une description brute (retours à la ligne, espaces multiples) et la coupe proprement. */
export const toMetaDescription = (raw: string | null | undefined, max = 158) => {
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trim()}…`;
};
