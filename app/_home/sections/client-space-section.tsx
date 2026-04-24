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

export function ClientSpaceSection({ locale }: Props) {
  const copy = HOME_COPY[locale].clientSpace;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="client-space-title"
      className="bg-[#141446] text-[#f4ece4]"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#f4ece4]/60">
            {copy.eyebrow}
          </p>
          <h2
            id="client-space-title"
            className="font-serif text-3xl md:text-4xl font-semibold leading-[1.12]"
          >
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#f4ece4]/85">{copy.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {copy.cards.map((card) => (
            <article
              key={card.title}
              className="flex flex-col gap-3 rounded-[24px] bg-[#f4ece4]/5 p-6 ring-1 ring-[#f4ece4]/10 backdrop-blur-sm"
            >
              <h3 className="font-serif text-lg font-semibold text-[#f4ece4]">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#f4ece4]/80">{card.body}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={localizePath("/espace-client", locale)}
            className="inline-flex items-center justify-center rounded-full bg-[#f4ece4] px-6 py-3 text-sm font-semibold text-[#141446] transition hover:-translate-y-[1px] hover:opacity-95"
          >
            {copy.primaryLabel}
          </Link>
          <a
            href={`tel:${SILLAGE_PHONE_RAW}`}
            aria-label={phoneAria}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f4ece4] bg-transparent px-6 py-3 text-sm font-semibold text-[#f4ece4] transition hover:bg-[#f4ece4]/10"
          >
            <PhoneIcon className="h-4 w-4" />
            {copy.secondaryLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
