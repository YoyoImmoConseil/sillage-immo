import { CAROUSEL_ITEM } from "@/app/_home/shared/carousel-item";
import { HCarousel } from "@/app/_home/shared/mobile-carousel";

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  items: { title: string; body: string }[];
};

/** Étapes numérotées : carrousel mobile, grille desktop (même gabarit que l'accueil). */
export function StepsSection({ id, eyebrow, title, items }: Props) {
  return (
    <section aria-labelledby={id} className="sillage-section-light">
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{eyebrow}</p>
          <h2 id={id} className="sillage-section-title">
            {title}
          </h2>
        </div>
        <HCarousel desktopClassName="md:grid-cols-2 xl:grid-cols-4 md:gap-6" as="ol" ariaLabel={title}>
          {items.map((item, index) => (
            <li
              key={item.title}
              className={`${CAROUSEL_ITEM} flex flex-col gap-3 rounded-[24px] bg-white p-6 ring-1 ring-navy/5`}
            >
              <span className="font-serif text-sm text-navy/50">0{index + 1}</span>
              <h3 className="font-serif text-lg font-semibold text-navy">{item.title}</h3>
              <p className="text-sm leading-relaxed text-navy/75">{item.body}</p>
            </li>
          ))}
        </HCarousel>
      </div>
    </section>
  );
}
