import type { AppLocale } from "@/lib/i18n/config";
import {
  HOME_COPY,
  PHONE_ARIA_LABEL,
  SILLAGE_PHONE_RAW,
} from "../copy";
import { PhoneIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

export function NeighborhoodsSection({ locale }: Props) {
  const copy = HOME_COPY[locale].neighborhoods;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="neighborhoods-title"
      className="sillage-section-light"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="neighborhoods-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.subtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {copy.items.map((item) => (
            <article
              key={item.name}
              className="flex flex-col gap-2 rounded-[20px] bg-white p-5 ring-1 ring-[#141446]/5 transition hover:ring-[#141446]/15"
            >
              <h3 className="font-serif text-base font-semibold text-[#141446]">
                {item.name}
              </h3>
              <p className="text-sm leading-relaxed text-[#141446]/75">
                {item.body}
              </p>
            </article>
          ))}
        </div>

        <div>
          <a
            href={`tel:${SILLAGE_PHONE_RAW}`}
            aria-label={phoneAria}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#141446] bg-transparent px-6 py-3 text-sm font-semibold text-[#141446] transition hover:bg-[#141446]/5"
          >
            <PhoneIcon className="h-4 w-4" />
            {copy.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
