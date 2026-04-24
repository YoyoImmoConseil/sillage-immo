import type { AppLocale } from "@/lib/i18n/config";
import {
  HOME_COPY,
  PHONE_ARIA_LABEL,
  SILLAGE_PHONE_RAW,
} from "../copy";
import { PhoneIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

export function InternationalSection({ locale }: Props) {
  const copy = HOME_COPY[locale].international;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="international-title"
      className="bg-white"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="international-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.subtitle}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {copy.benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="flex flex-col gap-3 rounded-[24px] bg-[#f4ece4] p-6 ring-1 ring-[#141446]/5"
            >
              <h3 className="font-serif text-lg font-semibold text-[#141446]">
                {benefit.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#141446]/75">
                {benefit.body}
              </p>
            </article>
          ))}
        </div>

        <div>
          <a
            href={`tel:${SILLAGE_PHONE_RAW}`}
            aria-label={phoneAria}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#141446] px-6 py-3 text-sm font-semibold text-[#f4ece4] transition hover:-translate-y-[1px] hover:opacity-95"
          >
            <PhoneIcon className="h-4 w-4" />
            {copy.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
