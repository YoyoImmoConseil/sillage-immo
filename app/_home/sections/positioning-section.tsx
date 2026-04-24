import type { AppLocale } from "@/lib/i18n/config";
import { HOME_COPY } from "../copy";
import { ArrowIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

export function PositioningSection({ locale }: Props) {
  const copy = HOME_COPY[locale].positioning;
  return (
    <section
      aria-labelledby="positioning-title"
      className="bg-white"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-12">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="positioning-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.intro}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {copy.cards.map((card, index) => (
            <article
              key={card.title}
              className="relative flex flex-col gap-4 rounded-[28px] bg-[#f4ece4] p-8 ring-1 ring-[#141446]/5"
            >
              <span className="absolute right-6 top-6 font-serif text-sm text-[#141446]/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-serif text-xl font-semibold text-[#141446]">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#141446]/80">
                {card.body}
              </p>
            </article>
          ))}
        </div>
        <div className="flex">
          <a
            href="#methode"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#141446] underline-offset-4 hover:underline"
          >
            {copy.ctaLabel}
            <ArrowIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
