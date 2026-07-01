"use client";

import {
  Children,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * Carrousel horizontal mobile-first (intention marketing : réduire la longueur
 * de page sur smartphone et suggérer qu'il y a d'autres cartes à faire défiler).
 *
 * - MOBILE (< 768px) : rangée `flex` à défilement horizontal avec scroll-snap ;
 *   chaque carte occupe ~86% de la largeur (une carte + un bord de la suivante
 *   visibles). Un indicateur de position (points ou barre) est affiché dessous.
 * - DESKTOP (≥ 768px) : le conteneur redevient EXACTEMENT la grille d'origine
 *   (classes passées via `desktopClassName`) → rendu desktop strictement inchangé.
 *
 * Les classes de snap/largeur sont posées sur les cartes par l'appelant via
 * la constante `CAROUSEL_ITEM` (inertes en grille desktop).
 */

// À appliquer sur chaque enfant/carte du carrousel.
export const CAROUSEL_ITEM = "snap-start shrink-0 basis-[86%] md:basis-auto";

const SCROLLER_BASE =
  "no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 -mx-4 px-4 md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:scroll-px-0";

type Props = {
  children: ReactNode;
  /** Classes de la grille desktop (ex. "md:grid-cols-3 md:gap-6"). */
  desktopClassName: string;
  /** Type de conteneur (ex. "ol" pour conserver la sémantique de liste). */
  as?: ElementType;
  /** Indicateur : points (peu d'items) ou barre de progression (beaucoup). */
  indicator?: "dots" | "bar";
  ariaLabel?: string;
};

export function HCarousel({
  children,
  desktopClassName,
  as = "div",
  indicator = "dots",
  ariaLabel,
}: Props) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const count = Children.count(children);
  const [active, setActive] = useState(0);
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || count < 2) return;
    // Suivi uniquement sur mobile : en desktop c'est une grille, pas de carrousel.
    const mql = window.matchMedia("(max-width: 767px)");
    if (!mql.matches) return;

    if (indicator === "dots") {
      const items = Array.from(el.children);
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              const index = items.indexOf(entry.target);
              if (index >= 0) setActive(index);
            }
          });
        },
        { root: el, threshold: [0.6] }
      );
      items.forEach((item) => observer.observe(item));
      return () => observer.disconnect();
    }

    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setRatio(max > 0 ? el.scrollLeft / max : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [indicator, count]);

  const scrollToIndex = (index: number) => {
    const el = scrollerRef.current;
    const target = el?.children[index] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const Tag = as as ElementType;

  return (
    <div>
      <Tag
        ref={scrollerRef}
        className={`${SCROLLER_BASE} ${desktopClassName}`}
        aria-label={ariaLabel}
      >
        {children}
      </Tag>
      {count > 1 ? (
        indicator === "dots" ? (
          <div className="mt-4 flex justify-center gap-2 md:hidden">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`${index + 1} / ${count}`}
                aria-current={index === active}
                onClick={() => scrollToIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === active ? "w-5 bg-navy" : "w-2 bg-navy/25"
                }`}
              />
            ))}
          </div>
        ) : (
          <div
            className="mt-4 h-1 w-full overflow-hidden rounded-full bg-navy/10 md:hidden"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-navy"
              style={{
                width: `${100 / count}%`,
                marginLeft: `${ratio * (100 - 100 / count)}%`,
              }}
            />
          </div>
        )
      ) : null}
    </div>
  );
}
