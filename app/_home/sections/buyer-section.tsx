import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY } from "../copy";

type Props = { locale: AppLocale };

function DrawnZoneMap({ caption }: { caption: string }) {
  return (
    <figure className="relative overflow-hidden rounded-[28px] bg-[#141446] shadow-xl ring-1 ring-[#141446]/10">
      <svg
        viewBox="0 0 600 420"
        role="img"
        aria-label={caption}
        className="h-full w-full"
      >
        <defs>
          <pattern
            id="grid-pattern"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(244, 236, 228, 0.08)"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="sea" x1="0" y1="1" x2="1" y2="0.2">
            <stop offset="0%" stopColor="#0e0e35" />
            <stop offset="100%" stopColor="#1e1e62" />
          </linearGradient>
          <linearGradient id="zone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4ece4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f4ece4" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <rect width="600" height="420" fill="url(#sea)" />
        <rect width="600" height="420" fill="url(#grid-pattern)" />

        <path
          d="M 0 300 Q 120 260 240 280 T 480 270 L 600 280 L 600 420 L 0 420 Z"
          fill="rgba(244, 236, 228, 0.06)"
        />

        <path
          d="M 80 80 L 180 110 L 220 200 L 320 230 L 380 150 L 450 190 L 420 290 L 300 340 L 180 320 L 110 240 Z"
          fill="url(#zone)"
          stroke="#f4ece4"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeLinejoin="round"
        />

        {[
          [80, 80],
          [180, 110],
          [220, 200],
          [320, 230],
          [380, 150],
          [450, 190],
          [420, 290],
          [300, 340],
          [180, 320],
          [110, 240],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="8" fill="#141446" />
            <circle cx={x} cy={y} r="5" fill="#f4ece4" />
          </g>
        ))}

        <g transform="translate(310 240)">
          <circle r="9" fill="#f4ece4" />
          <circle r="4" fill="#141446" />
        </g>
        <g transform="translate(240 160)">
          <circle r="9" fill="#f4ece4" />
          <circle r="4" fill="#141446" />
        </g>
        <g transform="translate(370 220)">
          <circle r="9" fill="#f4ece4" />
          <circle r="4" fill="#141446" />
        </g>
      </svg>
      <figcaption className="absolute bottom-4 left-4 right-4 rounded-full bg-[#f4ece4]/90 px-4 py-2 text-xs text-[#141446]/80 backdrop-blur">
        {caption}
      </figcaption>
    </figure>
  );
}

export function BuyerSection({ locale }: Props) {
  const copy = HOME_COPY[locale].buyer;
  const ctaCopy = HOME_COPY[locale].ctaGlobal;

  return (
    <section
      aria-labelledby="buyer-title"
      className="bg-white"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
        <div className="grid gap-10 lg:grid-cols-[55%_45%] lg:items-center">
          <div className="space-y-8">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
                {copy.eyebrow}
              </p>
              <h2 id="buyer-title" className="sillage-section-title">
                {copy.title}
              </h2>
              <p className="sillage-editorial-text text-[#141446]/80">
                {copy.subtitle}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {copy.benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="flex flex-col gap-2 rounded-[20px] bg-[#f4ece4] p-5 ring-1 ring-[#141446]/5"
                >
                  <h3 className="font-serif text-base font-semibold text-[#141446]">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#141446]/75">
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={localizePath("/recherche/nouvelle", locale)}
                className="inline-flex items-center justify-center rounded-full bg-[#141446] px-6 py-3 text-sm font-semibold text-[#f4ece4] shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
              >
                {ctaCopy.search}
              </Link>
              <Link
                href={localizePath("/vente", locale)}
                className="inline-flex items-center justify-center rounded-full border border-[#141446] bg-transparent px-6 py-3 text-sm font-semibold text-[#141446] transition hover:bg-[#141446]/5"
              >
                {ctaCopy.viewSales}
              </Link>
            </div>
          </div>
          <DrawnZoneMap caption={copy.mapCaption} />
        </div>
      </div>
    </section>
  );
}
