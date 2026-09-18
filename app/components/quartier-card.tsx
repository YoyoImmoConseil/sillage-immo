import Image from "next/image";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import type { Quartier } from "@/lib/quartiers/data";
import { QUARTIERS_UI } from "@/lib/quartiers/copy";
import { formatPpm, getZoneStats } from "@/lib/quartiers/stats";

type Props = {
  quartier: Quartier;
  locale: AppLocale;
  /** h2 sur l'index des quartiers, h3 quand la carte vit dans une section. */
  headingLevel?: "h2" | "h3";
  className?: string;
  trackLocation?: string;
};

/**
 * Carte quartier (photo, nom, accroche, prix médian DVF, lien) partagée entre
 * l'index /quartiers et la section « Nos quartiers » de l'accueil.
 */
export function QuartierCard({
  quartier,
  locale,
  headingLevel = "h3",
  className = "",
  trackLocation,
}: Props) {
  const ui = QUARTIERS_UI[locale];
  const stats = getZoneStats(quartier.statsKey);
  const median = stats?.apartments.medianPpmMainYear ?? stats?.apartments.medianPpm ?? null;
  const Heading = headingLevel;

  return (
    <Link
      href={localizePath(`/quartiers/${quartier.slug}`, locale)}
      data-track-cta={`quartier_${quartier.slug}`}
      data-track-location={trackLocation}
      className={`group flex h-full flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-navy/10 transition hover:-translate-y-[2px] hover:ring-navy/25 ${className}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy/5">
        <Image
          src={quartier.image.src}
          alt={quartier.image.alt}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 86vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <Heading className="font-serif text-2xl font-semibold text-navy">{quartier.name}</Heading>
        <p className="text-sm leading-relaxed text-navy/75">{quartier.tagline[locale]}</p>
        {median ? (
          <p className="mt-auto pt-3 text-sm text-navy/65">
            {ui.medianLabel} ·{" "}
            <span className="font-semibold text-navy">{formatPpm(median, locale)}</span>
          </p>
        ) : null}
        <span className="text-sm font-semibold text-navy">{ui.seeQuartier} →</span>
      </div>
    </Link>
  );
}
