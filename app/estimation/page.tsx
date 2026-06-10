import Image from "next/image";
import { SellerApiFirstFlow } from "./seller-api-first-flow";
import { SillageLogo } from "../components/sillage-logo";
import { getRequestLocale } from "@/lib/i18n/request";
import { ESTIMATION_PAGE_COPY } from "./_copy/page-copy";

export default async function EstimationPage() {
  const locale = await getRequestLocale();
  const copy = ESTIMATION_PAGE_COPY[locale];

  return (
    <main className="min-h-screen">
      <section
        aria-labelledby="estimation-hero-title"
        className="relative isolate overflow-hidden bg-[#141446] text-[#f4ece4]"
      >
        <Image
          src="/decor-sillage-blue.svg"
          alt=""
          width={320}
          height={310}
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 opacity-[0.10]"
        />
        <div className="relative w-full px-6 py-12 md:px-10 md:py-20 xl:px-14 xl:py-24 2xl:px-20">
          <div className="grid gap-10 lg:grid-cols-[50%_50%] lg:items-center">
            <div className="max-w-[840px]">
              <SillageLogo priority className="h-auto w-full" />
            </div>
            <div className="space-y-5 max-w-3xl">
              <p className="text-[11px] md:text-xs uppercase tracking-[0.22em] text-[#f4ece4]/75">
                {copy.eyebrow}
              </p>
              <h1
                id="estimation-hero-title"
                className="sillage-section-title-font text-3xl md:text-5xl xl:text-[52px] font-semibold leading-[1.1] tracking-tight"
              >
                {copy.title}
              </h1>
              <p className="sillage-editorial-text text-[#f4ece4]/90 max-w-3xl">
                {copy.subtitle}
              </p>
              <ul className="flex flex-wrap gap-2 pt-2">
                {copy.microProofs.map((proof) => (
                  <li
                    key={proof}
                    className="inline-flex items-center rounded-full border border-[#f4ece4]/40 bg-[#f4ece4]/5 px-3 py-1.5 text-xs md:text-[13px] text-[#f4ece4]/90"
                  >
                    {proof}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Sillage Immo - réassurance estimation"
        className="bg-[#f4ece4] text-[#141446] border-b border-[#141446]/10"
      >
        <div className="w-full px-6 py-10 md:px-10 md:py-12 xl:px-14 2xl:px-20">
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {copy.reassurance.map((item) => (
              <li
                key={item.title}
                className="rounded-[20px] bg-white p-5 ring-1 ring-[#141446]/5"
              >
                <h2 className="font-serif text-base font-semibold text-[#141446]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#141446]/75">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="estimation-what-title"
        className="bg-[#f4ece4] text-[#141446]"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
              {copy.whatYouGet.eyebrow}
            </p>
            <h2 id="estimation-what-title" className="sillage-section-title">
              {copy.whatYouGet.title}
            </h2>
          </div>
          <ul className="grid gap-5 md:grid-cols-3">
            {copy.whatYouGet.cards.map((card, index) => (
              <li
                key={card.title}
                className="rounded-[24px] bg-white p-6 ring-1 ring-[#141446]/5"
              >
                <span className="font-serif text-sm text-[#141446]/50">
                  0{index + 1}
                </span>
                <h3 className="mt-2 font-serif text-lg font-semibold text-[#141446]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#141446]/75">
                  {card.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="max-w-4xl rounded-[20px] border-l-4 border-[#141446] bg-white/70 px-5 py-4 text-sm md:text-base italic text-[#141446]/85 leading-relaxed">
            {copy.differentiation}
          </p>
        </div>
      </section>

      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-8 md:px-10 md:py-12 xl:px-14 2xl:px-20">
          <SellerApiFirstFlow locale={locale} />
        </div>
      </section>
    </main>
  );
}
