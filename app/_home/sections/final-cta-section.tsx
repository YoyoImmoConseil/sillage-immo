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

export function FinalCtaSection({ locale }: Props) {
  const copy = HOME_COPY[locale].finalCta;
  const ctaCopy = HOME_COPY[locale].ctaGlobal;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="final-cta-title"
      className="bg-[#141446] text-[#f4ece4]"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
        <div className="max-w-3xl space-y-6">
          <h2
            id="final-cta-title"
            className="font-serif text-3xl md:text-4xl font-semibold leading-[1.12]"
          >
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#f4ece4]/85">{copy.body}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={localizePath("/estimation", locale)}
              className="inline-flex items-center justify-center rounded-full bg-[#f4ece4] px-6 py-3 text-sm font-semibold text-[#141446] shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
            >
              {ctaCopy.estimate}
            </Link>
            <Link
              href={localizePath("/recherche/nouvelle", locale)}
              className="inline-flex items-center justify-center rounded-full border border-[#f4ece4] bg-transparent px-6 py-3 text-sm font-semibold text-[#f4ece4] transition hover:bg-[#f4ece4]/10"
            >
              {ctaCopy.search}
            </Link>
            <a
              href={`tel:${SILLAGE_PHONE_RAW}`}
              aria-label={phoneAria}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f4ece4]/50 bg-transparent px-6 py-3 text-sm font-semibold text-[#f4ece4] transition hover:border-[#f4ece4] hover:bg-[#f4ece4]/10"
            >
              <PhoneIcon className="h-4 w-4" />
              {ctaCopy.callSillage}
            </a>
          </div>
          <p className="text-xs md:text-sm text-[#f4ece4]/60">{copy.microcopy}</p>
        </div>
      </div>
    </section>
  );
}
