import type { ReactNode } from "react";

/**
 * Gabarit commun des pages légales (mentions, honoraires, confidentialité).
 * Colonne de lecture étroite, hiérarchie sobre, même palette que le site.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-sand">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
        <header className="space-y-3 border-b border-[rgba(20,20,70,0.15)] pb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-navy/60">{eyebrow}</p>
          <h1 className="sillage-section-title text-navy">{title}</h1>
          {intro ? <p className="text-base leading-relaxed text-navy/80">{intro}</p> : null}
          {updatedAt ? <p className="text-xs text-navy/55">Dernière mise à jour : {updatedAt}</p> : null}
        </header>
        <div className="legal-content space-y-8 pt-8 text-[15px] leading-relaxed text-navy/85">
          {children}
        </div>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}

export function LegalFacts({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,220px)_1fr]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-navy/60">{item.label}</dt>
          <dd className="m-0 text-navy">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
