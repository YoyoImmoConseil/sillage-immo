import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY } from "../copy";
import { CAROUSEL_ITEM } from "../shared/carousel-item";
import { HCarousel } from "../shared/mobile-carousel";
import { ArrowIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

const DOOR_PATHS = {
  buy: "/acheter",
  sell: "/vendre",
  rent: "/louer",
  manage: "/gestion-locative",
} as const;

/**
 * Les quatre parcours du site, juste sous les preuves : Acheter, Vendre,
 * Louer, Faire gérer. La gestion locative y affiche son tarif en clair.
 */
export function DoorsSection({ locale }: Props) {
  const copy = HOME_COPY[locale].doors;

  return (
    <section aria-labelledby="doors-title" className="bg-white">
      <div className="w-full px-4 py-14 md:px-10 md:py-20 xl:px-14 2xl:px-20 space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.eyebrow}</p>
          <h2 id="doors-title" className="sillage-section-title">
            {copy.title}
          </h2>
        </div>
        <HCarousel desktopClassName="md:grid-cols-2 xl:grid-cols-4 md:gap-6" as="ul" ariaLabel={copy.title}>
          {copy.items.map((item) => (
            <li key={item.key} className={`${CAROUSEL_ITEM} flex`}>
              <Link
                href={localizePath(DOOR_PATHS[item.key], locale)}
                data-track-cta={`home_door_${item.key}`}
                data-track-location="home_doors"
                className="group flex w-full flex-col gap-3 rounded-[24px] bg-sand/40 p-6 ring-1 ring-navy/10 transition hover:-translate-y-[2px] hover:bg-sand/70"
              >
                <h3 className="font-serif text-2xl font-semibold text-navy">{item.title}</h3>
                <p className="text-sm leading-relaxed text-navy/75">{item.body}</p>
                {item.highlight ? (
                  <p className="inline-flex w-fit rounded-full bg-navy px-3 py-1 text-xs font-semibold tracking-wide text-sand">
                    {item.highlight}
                  </p>
                ) : null}
                <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-navy">
                  {item.cta}
                  <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </HCarousel>
      </div>
    </section>
  );
}
