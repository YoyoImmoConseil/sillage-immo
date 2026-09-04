import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { SITE_URL } from "@/lib/seo/site";
import { listPublicPropertyListings } from "@/services/properties/property-listing.service";

export const revalidate = 3600;

const STATIC_PATHS: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/vente", priority: 0.9, changeFrequency: "daily" },
  { path: "/location", priority: 0.8, changeFrequency: "daily" },
  { path: "/estimation", priority: 0.9, changeFrequency: "monthly" },
  { path: "/recherche/nouvelle", priority: 0.8, changeFrequency: "monthly" },
];

const withLanguages = (path: string) => ({
  url: `${SITE_URL}${localizePath(path, "fr")}`,
  alternates: {
    languages: Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [locale, `${SITE_URL}${localizePath(path, locale)}`])
    ),
  },
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    ...withLanguages(entry.path),
    priority: entry.priority,
    changeFrequency: entry.changeFrequency,
  }));

  // Annonces publiées (vente + location). En cas d'erreur base, on garde les
  // pages fixes plutôt que de casser le sitemap.
  try {
    const [sale, rental] = await Promise.all([
      listPublicPropertyListings({ businessType: "sale", pageSize: 100 }),
      listPublicPropertyListings({ businessType: "rental", pageSize: 100 }),
    ]);
    for (const listing of [...sale, ...rental]) {
      entries.push({
        ...withLanguages(listing.canonicalPath),
        lastModified: listing.publishedAt ? new Date(listing.publishedAt) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("[sitemap] listings unavailable", error);
  }

  return entries;
}
