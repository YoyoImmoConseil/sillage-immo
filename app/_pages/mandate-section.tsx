import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import type { SellPageCopy } from "./copy";

type Props = { locale: AppLocale; copy: SellPageCopy["mandate"] };

/**
 * Le Mandat Sillage : le renversement d'engagement (le vendeur ne signe rien,
 * l'agence s'engage), les engagements numérotés, « Et si vous partez ? » et
 * « Ce que nous refusons ». Un seul produit, pas de grille comparative.
 */
export function MandateSection({ locale, copy }: Props) {
  return (
    <section id="mandat-sillage" aria-labelledby="mandate-title" className="bg-navy text-sand scroll-mt-24">
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-12">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs uppercase tracking-[0.22em] text-sand/70">{copy.eyebrow}</p>
          <h2
            id="mandate-title"
            className="sillage-section-title-font text-[30px] leading-[1.1] md:text-5xl font-semibold md:leading-[1.06] tracking-tight"
          >
            {copy.title}
          </h2>
          <p className="text-base md:text-lg leading-relaxed text-sand/85">{copy.intro}</p>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 md:gap-6">
          {copy.engagements.map((item, index) => (
            <li
              key={item.title}
              className="flex gap-5 rounded-[24px] border border-sand/15 bg-white/5 p-6 md:p-8"
            >
              <span className="font-serif text-3xl font-semibold leading-none text-sand/60 md:text-4xl">
                {index + 1}
              </span>
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-semibold leading-snug md:text-xl">{item.title}</h3>
                <p className="text-sm leading-relaxed text-sand/80 md:text-base">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="grid gap-6 md:grid-cols-2">
          <article className="space-y-3 rounded-[24px] bg-sand p-6 text-navy md:p-8">
            <h3 className="font-serif text-xl font-semibold md:text-2xl">{copy.leave.title}</h3>
            <p className="text-sm leading-relaxed text-navy/85 md:text-base">{copy.leave.body}</p>
          </article>
          <article className="space-y-4 rounded-[24px] border border-sand/15 p-6 md:p-8">
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-semibold md:text-2xl">{copy.refuse.title}</h3>
              <p className="text-sm text-sand/70">{copy.refuse.intro}</p>
            </div>
            <ul className="space-y-2">
              {copy.refuse.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-sand/85 md:text-base">
                  <span aria-hidden="true" className="mt-[0.7em] h-px w-4 flex-none bg-sand/60" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <Link
          href={localizePath("/estimation", locale)}
          className="inline-flex items-center justify-center rounded-full bg-sand px-6 py-3 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}
