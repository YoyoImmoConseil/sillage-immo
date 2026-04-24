import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY } from "../copy";
import { CheckIcon, MinusIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

export function ComparisonSection({ locale }: Props) {
  const copy = HOME_COPY[locale].comparison;

  return (
    <section
      aria-labelledby="comparison-title"
      className="bg-white"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="comparison-title" className="sillage-section-title">
            {copy.title}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-[28px] border border-[#141446]/10 bg-[#f4ece4]/40 p-8">
            <h3 className="font-serif text-xl font-semibold text-[#141446]/70">
              {copy.aloneTitle}
            </h3>
            <ul className="space-y-3">
              {copy.alonePoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-[#141446]/70">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#141446]/10 text-[#141446]/70">
                    <MinusIcon className="h-3 w-3" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="flex flex-col gap-5 rounded-[28px] bg-[#141446] p-8 text-[#f4ece4] shadow-xl">
            <h3 className="font-serif text-xl font-semibold">
              {copy.sillageTitle}
            </h3>
            <ul className="space-y-3">
              {copy.sillagePoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-[#f4ece4]/90">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#f4ece4]/20 text-[#f4ece4]">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Link
                href={localizePath("/estimation", locale)}
                className="inline-flex items-center justify-center rounded-full bg-[#f4ece4] px-6 py-3 text-sm font-semibold text-[#141446] transition hover:-translate-y-[1px] hover:opacity-95"
              >
                {copy.ctaLabel}
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
