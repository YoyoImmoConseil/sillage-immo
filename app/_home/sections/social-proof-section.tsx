import type { AppLocale } from "@/lib/i18n/config";
import { HOME_COPY } from "../copy";

type Props = { locale: AppLocale };

export function SocialProofSection({ locale }: Props) {
  const items = HOME_COPY[locale].socialProof.items;
  return (
    <section
      aria-label="Sillage Immo - preuves"
      className="sillage-section-light border-b border-[#141446]/10"
    >
      <div className="w-full px-6 py-8 md:px-10 md:py-10 xl:px-14 2xl:px-20">
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-10">
          {items.map((item) => (
            <li
              key={`${item.figure}-${item.label}`}
              className="flex flex-col items-start gap-1 border-l border-[#141446]/15 pl-4 md:pl-6"
            >
              <span className="font-serif text-2xl md:text-3xl font-semibold text-[#141446]">
                {item.figure}
              </span>
              <span className="text-xs md:text-sm text-[#141446]/70 leading-snug">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
