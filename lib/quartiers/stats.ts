import stats from "@/lib/quartiers-dvf-stats.json";
import type { AppLocale } from "@/lib/i18n/config";

type ZoneStats = {
  sales: { mainYear: number; period: number };
  apartments: {
    n: number;
    nMainYear: number;
    medianPpmMainYear: number | null;
    medianPpm: number | null;
    q1Ppm: number | null;
    q3Ppm: number | null;
    p90Ppm: number | null;
    medianSurface: number | null;
    medianPrice: number | null;
  };
  houses: { n: number; medianPrice: number | null; medianSurface: number | null };
  seafront?: {
    n: number;
    medianPpm: number;
    p90Ppm: number | null;
    centre: { n: number; medianPpm: number; p90Ppm: number | null };
  };
};

type DvfStats = {
  source: string;
  years: string[];
  mainYear: string;
  computedAt: string;
  method: string;
  zones: Record<string, ZoneStats>;
};

const DATA = stats as DvfStats;

export const DVF_META = {
  source: DATA.source,
  years: DATA.years,
  mainYear: DATA.mainYear,
  computedAt: DATA.computedAt,
  method: DATA.method,
};

export const getZoneStats = (key: string): ZoneStats | null => DATA.zones[key] ?? null;
export const getNiceStats = () => DATA.zones.nice;

const LOCALE_TAG: Record<AppLocale, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES", ru: "ru-RU" };

/** « 5 352 € » — espace insécable classique (rendu sûr dans tous les navigateurs). */
export const formatEur = (value: number, locale: AppLocale = "fr") =>
  new Intl.NumberFormat(LOCALE_TAG[locale], { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(value)
    .replace(/[  ]/g, " ");

export const formatPpm = (value: number, locale: AppLocale = "fr") => `${formatEur(value, locale)}/m²`;

export const formatInt = (value: number, locale: AppLocale = "fr") =>
  new Intl.NumberFormat(LOCALE_TAG[locale]).format(value).replace(/[  ]/g, " ");
