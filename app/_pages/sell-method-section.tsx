import type { SellPageCopy } from "./copy";

type Props = { copy: SellPageCopy["method"] };

/**
 * Méthode de vente développée : pour chaque étape, ce qu'on fait, le délai
 * et ce que le vendeur voit dans son espace. Liste verticale numérotée,
 * lisible sur mobile sans carrousel (le contenu est fait pour être lu).
 */
export function SellMethodSection({ copy }: Props) {
  return (
    <section id="methode" aria-labelledby="sell-method-title" className="sillage-section-light scroll-mt-24">
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-12">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.eyebrow}</p>
          <h2 id="sell-method-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-navy/80">{copy.subtitle}</p>
        </div>

        <ol className="space-y-4 md:space-y-6">
          {copy.steps.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-4 rounded-[24px] bg-white p-6 ring-1 ring-navy/5 md:grid-cols-[auto_minmax(0,3fr)_minmax(0,2fr)] md:gap-8 md:p-8"
            >
              <span className="font-serif text-3xl font-semibold leading-none text-navy/35 md:text-4xl">
                0{index + 1}
              </span>
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-semibold text-navy md:text-2xl">{step.title}</h3>
                <p className="text-sm leading-relaxed text-navy/80 md:text-base">{step.body}</p>
              </div>
              <dl className="grid gap-3 self-start rounded-[18px] bg-sand/50 p-4 text-sm sm:grid-cols-2 md:grid-cols-1">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-navy/55">{copy.timingLabel}</dt>
                  <dd className="mt-1 font-semibold text-navy">{step.timing}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-navy/55">{copy.spaceLabel}</dt>
                  <dd className="mt-1 text-navy/85">{step.space}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
