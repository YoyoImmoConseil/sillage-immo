import type { AppLocale } from "@/lib/i18n/config";
import { HOME_BLOCKS_COPY } from "../copy-blocks";

type Props = { locale: AppLocale };

/**
 * Chiffres nominatifs (fondateur, équipe) qui ouvrent le bloc « preuve », suivi
 * directement des ventes récentes : même fond blanc, pas de bordure, pour que
 * les deux se lisent comme un seul écran.
 */
export function ProofSection({ locale }: Props) {
  const { items, attribution } = HOME_BLOCKS_COPY[locale].proof;
  return (
    <section aria-label="Sillage Immo - preuves" className="bg-white">
      <div className="w-full px-4 pt-14 pb-4 md:px-10 md:pt-20 md:pb-6 xl:px-14 2xl:px-20 space-y-6">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-4 md:gap-10">
          {items.map((item) => (
            <li
              key={item.figure}
              className="flex flex-col items-start gap-1 border-l border-navy/15 pl-3 md:pl-6"
            >
              <span className="font-serif text-2xl md:text-3xl font-semibold text-navy">
                {item.figure}
              </span>
              <span className="text-xs md:text-sm leading-snug text-navy/70">{item.label}</span>
            </li>
          ))}
        </ul>
        <p className="max-w-3xl text-sm md:text-base leading-relaxed text-navy/70">{attribution}</p>
      </div>
    </section>
  );
}
