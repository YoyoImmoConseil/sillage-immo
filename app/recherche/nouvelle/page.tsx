import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { listPropertyTypesForBusinessType } from "@/services/properties/property-listing.service";
import { mergeWithCanonicalPropertyTypes } from "@/lib/properties/canonical-types";
import type { PropertyBusinessType } from "@/types/domain/properties";
import { BuyerSignupForm } from "./_components/buyer-signup-form";
import { newSearchPageCopy } from "./_components/new-search-page-copy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const metadata = {
    fr: {
      title: "Confier ma recherche immobilière | Sillage Immo",
      description:
        "Confiez-nous votre recherche immobilière à Nice et sur la Côte d'Azur : zone dessinée, alertes ciblées et accompagnement possible par un conseiller Sillage.",
    },
    en: {
      title: "Entrust my property search | Sillage Immo",
      description:
        "Entrust your property search in Nice and on the French Riviera: custom drawn zone, targeted alerts and optional follow-up by a Sillage advisor.",
    },
    es: {
      title: "Confiar mi búsqueda inmobiliaria | Sillage Immo",
      description:
        "Confíe su búsqueda inmobiliaria en Niza y en la Costa Azul: zona dibujada, alertas específicas y acompañamiento posible por un asesor Sillage.",
    },
    ru: {
      title: "Доверить мой запрос на недвижимость | Sillage Immo",
      description:
        "Доверьте нам поиск недвижимости в Ницце и на Лазурном Берегу: нарисованная зона, целевые уведомления и возможность сопровождения консультантом Sillage.",
    },
  }[locale];
  return metadata;
}

type BuyerSignupSearchParams = {
  businessType?: string;
  city?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  minRooms?: string;
  maxRooms?: string;
  minSurface?: string;
  maxSurface?: string;
  minFloor?: string;
  maxFloor?: string;
  terrace?: string;
  elevator?: string;
};

type NouvelleRecherchePageProps = {
  searchParams?: Promise<BuyerSignupSearchParams>;
};

const resolveBusinessType = (value: string | undefined): PropertyBusinessType => {
  return value === "rental" ? "rental" : "sale";
};

export default async function NouvelleRecherchePage({ searchParams }: NouvelleRecherchePageProps) {
  const locale = await getRequestLocale();
  const resolvedParams = (await searchParams) ?? {};
  const businessType = resolveBusinessType(resolvedParams.businessType);
  const [dbSaleTypes, dbRentalTypes] = await Promise.all([
    listPropertyTypesForBusinessType("sale").catch(() => [] as string[]),
    listPropertyTypesForBusinessType("rental").catch(() => [] as string[]),
  ]);
  const saleTypes = mergeWithCanonicalPropertyTypes("sale", dbSaleTypes);
  const rentalTypes = mergeWithCanonicalPropertyTypes("rental", dbRentalTypes);

  const copy = newSearchPageCopy[locale];

  const loginHref = localizePath("/espace-client/login", locale);

  return (
    <main className="min-h-screen">
      <section
        aria-labelledby="recherche-hero-title"
        className="bg-navy text-sand"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-20 xl:px-14 xl:py-24 2xl:px-20 space-y-5">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.22em] text-sand/75">
            {copy.kicker}
          </p>
          <h1
            id="recherche-hero-title"
            className="sillage-section-title-font text-3xl md:text-5xl xl:text-[52px] font-semibold leading-[1.1] tracking-tight max-w-4xl"
          >
            {copy.title}
          </h1>
          <p className="sillage-editorial-text max-w-3xl text-sand/90">{copy.intro}</p>
          <ul
            aria-label={copy.kicker}
            className="flex flex-col gap-1.5 pt-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1.5"
          >
            {copy.microProofs.map((proof) => (
              <li
                key={proof}
                className="inline-flex items-center gap-2 text-xs md:text-[13px] text-sand/85"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 shrink-0 text-[#f4c47a]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8.5l3 3 7-7" />
                </svg>
                <span>{proof}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="recherche-why-title"
        className="bg-sand text-navy border-b border-navy/10"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-8">
          <h2 id="recherche-why-title" className="sillage-section-title max-w-3xl">
            {copy.whyTitle}
          </h2>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {copy.whyCards.map((card) => (
              <li
                key={card.title}
                className="rounded-[20px] bg-white p-5 ring-1 ring-navy/5"
              >
                <h3 className="font-serif text-base font-semibold text-navy">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/75">{card.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="recherche-after-title"
        className="bg-sand text-navy"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-8">
          <h2 id="recherche-after-title" className="sillage-section-title max-w-3xl">
            {copy.afterTitle}
          </h2>
          <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {copy.afterSteps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-[24px] bg-white p-6 ring-1 ring-navy/5"
              >
                <span className="font-serif text-sm text-navy/50">
                  0{index + 1}
                </span>
                <h3 className="mt-2 font-serif text-lg font-semibold text-navy">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/75">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
          <p className="max-w-4xl rounded-[20px] border-l-4 border-navy bg-white/70 px-5 py-4 text-sm md:text-base italic text-navy/85 leading-relaxed">
            {copy.differentiation}
          </p>
        </div>
      </section>

      <section className="bg-sand text-navy">
        <div className="w-full px-6 py-10 md:px-10 xl:px-14 2xl:px-20 space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-5 shadow-sm">
              <h2 className="text-base font-semibold uppercase tracking-[0.12em] text-navy">
                {copy.existingAccountTitle}
              </h2>
              <p className="mt-2 text-sm text-navy/80">{copy.existingAccountBody}</p>
              <Link
                href={loginHref}
                className="sillage-btn-secondary mt-4 inline-flex rounded px-4 py-2 text-sm"
              >
                {copy.existingAccountCta}
              </Link>
            </article>
            <article className="rounded-2xl border border-navy bg-navy p-5 text-sand shadow-sm">
              <h2 className="text-base font-semibold uppercase tracking-[0.12em] text-[#f4c47a]">
                {copy.newAccountTitle}
              </h2>
              <p className="mt-2 text-sm text-sand/82">{copy.newAccountBody}</p>
            </article>
          </div>

          <BuyerSignupForm
            locale={locale}
            initialBusinessType={businessType}
            saleTypes={saleTypes}
            rentalTypes={rentalTypes}
            initialFilters={{
              city: resolvedParams.city ?? "",
              type: resolvedParams.type ?? "",
              minPrice: resolvedParams.minPrice ?? "",
              maxPrice: resolvedParams.maxPrice ?? "",
              minRooms: resolvedParams.minRooms ?? "",
              maxRooms: resolvedParams.maxRooms ?? "",
              minSurface: resolvedParams.minSurface ?? "",
              maxSurface: resolvedParams.maxSurface ?? "",
              minFloor: resolvedParams.minFloor ?? "",
              maxFloor: resolvedParams.maxFloor ?? "",
              terrace: resolvedParams.terrace ?? "",
              elevator: resolvedParams.elevator ?? "",
            }}
          />
        </div>
      </section>
    </main>
  );
}
