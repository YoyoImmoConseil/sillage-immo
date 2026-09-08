import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type HeroCta = { href: string; label: string; external?: boolean };

type PageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: { src: string; alt: string };
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  /** Contenu optionnel sous les boutons (ex. mention, micro-preuve). */
  children?: ReactNode;
};

/**
 * En-tête des pages métier (Acheter, Vendre, Louer, L'agence) : photo pleine
 * largeur, voile bleu nuit pour la lisibilité, titre serif et deux actions.
 * Le texte reste dans la colonne de gauche pour laisser respirer la photo.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  primaryCta,
  secondaryCta,
  children,
}: PageHeroProps) {
  const renderCta = (cta: HeroCta, variant: "primary" | "secondary") => {
    const className =
      variant === "primary"
        ? "inline-flex items-center justify-center rounded-full bg-sand px-6 py-3 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
        : "inline-flex items-center justify-center rounded-full border border-sand/70 bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand/10";
    if (cta.external || cta.href.startsWith("#") || cta.href.startsWith("tel:")) {
      return (
        <a key={cta.href} href={cta.href} className={className}>
          {cta.label}
        </a>
      );
    }
    return (
      <Link key={cta.href} href={cta.href} className={className}>
        {cta.label}
      </Link>
    );
  };

  return (
    <section className="relative isolate overflow-hidden bg-navy text-sand">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Voile : plus dense à gauche (texte) et en bas (transition vers la page). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/65 to-navy/30"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy/70 to-transparent"
      />
      <div className="relative w-full px-4 py-20 md:px-10 md:py-28 xl:px-14 2xl:px-20 min-h-[60vh] md:min-h-[68vh] flex items-end">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs uppercase tracking-[0.22em] text-sand/80">{eyebrow}</p>
          <h1 className="sillage-section-title-font text-[30px] leading-[1.1] md:text-5xl xl:text-[54px] font-semibold md:leading-[1.06] tracking-tight">
            {title}
          </h1>
          <p className="max-w-2xl text-base md:text-lg leading-relaxed text-sand">{subtitle}</p>
          {primaryCta || secondaryCta ? (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              {primaryCta ? renderCta(primaryCta, "primary") : null}
              {secondaryCta ? renderCta(secondaryCta, "secondary") : null}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}
