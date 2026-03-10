import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import {
  zoneCatalog,
  ZONE_CATALOG_VERSION,
  type ZoneCatalogEntry,
} from "./zone-catalog";

type RuntimeZoneCatalog = {
  catalog: ZoneCatalogEntry[];
  version: string;
  source: "database" | "static";
};

type ZoneCatalogRow = Database["public"]["Tables"]["zone_catalog"]["Row"];

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache:
  | {
      expiresAt: number;
      value: RuntimeZoneCatalog;
    }
  | null = null;

export const clearZoneCatalogCache = () => {
  cache = null;
};

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
};

export const getRuntimeZoneCatalog = async (): Promise<RuntimeZoneCatalog> => {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.value;
  }

  const { data, error } = await supabaseAdmin
    .from("zone_catalog")
    .select("slug, city, score, aliases, updated_at")
    .eq("is_active", true);

  if (!error && data && data.length > 0) {
    const mapped = data
      .map((row: ZoneCatalogRow) => ({
        slug: row.slug,
        city: row.city,
        score: row.score,
        aliases: isStringArray(row.aliases) ? row.aliases : [],
        updated_at: row.updated_at,
      }))
      .filter((row) => Number.isFinite(row.score));

    const latestUpdatedAt = mapped
      .map((row) => row.updated_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    const catalogFromDb: ZoneCatalogEntry[] = mapped.map((row) => ({
      slug: row.slug,
      city: row.city,
      score: row.score,
      aliases: row.aliases,
    }));

    const value: RuntimeZoneCatalog = {
      catalog: catalogFromDb,
      version: `db:${latestUpdatedAt ?? "unknown"}:${catalogFromDb.length}`,
      source: "database",
    };
    cache = { expiresAt: now + CACHE_TTL_MS, value };
    return value;
  }

  const fallback: RuntimeZoneCatalog = {
    catalog: zoneCatalog,
    version: `static:${ZONE_CATALOG_VERSION}`,
    source: "static",
  };
  cache = { expiresAt: now + CACHE_TTL_MS, value: fallback };
  return fallback;
};
