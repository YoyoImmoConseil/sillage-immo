import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY } from "../copy";
import { ArrowIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

export function CatalogSection({ locale }: Props) {
  const copy = HOME_COPY[locale].catalog;

  return (
    <section
      aria-labelledby="catalog-title"
      className="sillage-section-light"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="catalog-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href={localizePath("/vente", locale)}
            className="group flex flex-col gap-4 rounded-[28px] bg-white p-8 ring-1 ring-[#141446]/5 transition hover:-translate-y-[2px] hover:ring-[#141446]/20"
          >
            <h3 className="font-serif text-xl font-semibold text-[#141446]">
              {copy.salesTitle}
            </h3>
            <p className="text-sm leading-relaxed text-[#141446]/75">{copy.salesBody}</p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#141446]">
              {copy.salesCta}
              <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href={localizePath("/location", locale)}
            className="group flex flex-col gap-4 rounded-[28px] bg-white p-8 ring-1 ring-[#141446]/5 transition hover:-translate-y-[2px] hover:ring-[#141446]/20"
          >
            <h3 className="font-serif text-xl font-semibold text-[#141446]">
              {copy.rentalsTitle}
            </h3>
            <p className="text-sm leading-relaxed text-[#141446]/75">{copy.rentalsBody}</p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#141446]">
              {copy.rentalsCta}
              <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#141446]/70 max-w-xl">{copy.microcopy}</p>
          <Link
            href={localizePath("/recherche/nouvelle", locale)}
            className="inline-flex items-center justify-center rounded-full border border-[#141446] bg-transparent px-6 py-3 text-sm font-semibold text-[#141446] transition hover:bg-[#141446]/5"
          >
            {copy.alertCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
