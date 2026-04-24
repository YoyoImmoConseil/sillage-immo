import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import {
  HOME_COPY,
  PHONE_ARIA_LABEL,
  SILLAGE_PHONE_RAW,
} from "../copy";
import { PhoneIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

export function SellerSection({ locale }: Props) {
  const copy = HOME_COPY[locale].seller;
  const ctaCopy = HOME_COPY[locale].ctaGlobal;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="seller-title"
      className="sillage-section-light"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="seller-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.subtitle}</p>
        </div>

        <p className="max-w-3xl rounded-[20px] border-l-4 border-[#141446] bg-white/60 px-5 py-4 text-sm md:text-base italic text-[#141446]/85 leading-relaxed">
          {copy.exclusiveMandate}
        </p>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {copy.benefits.map((benefit, index) => (
            <article
              key={benefit.title}
              className="flex flex-col gap-3 rounded-[24px] bg-white p-6 ring-1 ring-[#141446]/5"
            >
              <span className="font-serif text-sm text-[#141446]/50">
                0{index + 1}
              </span>
              <h3 className="font-serif text-lg font-semibold text-[#141446]">
                {benefit.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#141446]/75">
                {benefit.body}
              </p>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={localizePath("/estimation", locale)}
            className="inline-flex items-center justify-center rounded-full bg-[#141446] px-6 py-3 text-sm font-semibold text-[#f4ece4] shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
          >
            {ctaCopy.discoverValue}
          </Link>
          <a
            href={`tel:${SILLAGE_PHONE_RAW}`}
            aria-label={phoneAria}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#141446] bg-transparent px-6 py-3 text-sm font-semibold text-[#141446] transition hover:bg-[#141446]/5"
          >
            <PhoneIcon className="h-4 w-4" />
            {ctaCopy.callAdvisor}
          </a>
        </div>
      </div>
    </section>
  );
}
