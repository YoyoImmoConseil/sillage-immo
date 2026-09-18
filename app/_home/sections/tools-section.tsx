import Link from "next/link";
import { HomeCommercialAssistant } from "@/app/components/home-commercial-assistant";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY, PHONE_ARIA_LABEL, SILLAGE_PHONE_RAW } from "../copy";
import { HOME_BLOCKS_COPY } from "../copy-blocks";
import { CAROUSEL_ITEM } from "../shared/carousel-item";
import { HCarousel } from "../shared/mobile-carousel";
import { PhoneIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

/**
 * « Vos outils » : espace client (trois cartes + accès) et assistant Sillage
 * réunis dans un seul écran, placé après la preuve et la méthode : l'outil
 * vient après le désir et la confiance, pas avant.
 */
export function ToolsSection({ locale }: Props) {
  const copy = HOME_BLOCKS_COPY[locale].tools;
  const cards = HOME_COPY[locale].clientSpace.cards;
  const labels = HOME_COPY[locale].clientSpace;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section aria-labelledby="tools-title" className="bg-navy text-sand">
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-sand/60">{copy.eyebrow}</p>
          <h2
            id="tools-title"
            className="font-serif text-3xl md:text-4xl font-semibold leading-[1.12]"
          >
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-sand/85">{copy.subtitle}</p>
        </div>

        <HCarousel desktopClassName="md:grid-cols-3 md:gap-6" as="ul" ariaLabel={copy.title}>
          {cards.map((card) => (
            <li
              key={card.title}
              className={`${CAROUSEL_ITEM} flex flex-col gap-3 rounded-[24px] bg-sand/5 p-6 ring-1 ring-sand/10 backdrop-blur-sm`}
            >
              <h3 className="font-serif text-lg font-semibold text-sand">{card.title}</h3>
              <p className="text-sm leading-relaxed text-sand/80">{card.body}</p>
            </li>
          ))}
        </HCarousel>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={localizePath("/espace-client", locale)}
            data-track-cta="tools_client_space"
            data-track-location="home_tools"
            className="inline-flex items-center justify-center rounded-full bg-sand px-6 py-3 text-sm font-semibold text-navy transition hover:-translate-y-[1px] hover:opacity-95"
          >
            {labels.primaryLabel}
          </Link>
          <a
            href={`tel:${SILLAGE_PHONE_RAW}`}
            aria-label={phoneAria}
            data-track-location="home_tools"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-sand bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand/10"
          >
            <PhoneIcon className="h-4 w-4" />
            {labels.secondaryLabel}
          </a>
        </div>

        <div className="space-y-5 border-t border-sand/15 pt-10">
          <p className="max-w-3xl text-sm md:text-base leading-relaxed text-sand/80">
            {copy.assistantLead}
          </p>
          <div className="rounded-[24px] bg-white p-4 text-navy md:p-6">
            <HomeCommercialAssistant locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
