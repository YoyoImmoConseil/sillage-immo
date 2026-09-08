type Props = { id: string; title: string; paragraphs: string[]; tone?: "light" | "white" };

/** Bloc éditorial court : un titre serif et deux paragraphes, colonne étroite. */
export function ManifestoSection({ id, title, paragraphs, tone = "white" }: Props) {
  return (
    <section aria-labelledby={id} className={tone === "white" ? "bg-white" : "sillage-section-light"}>
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
          <h2 id={id} className="sillage-section-title">
            {title}
          </h2>
          <div className="space-y-5">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="sillage-editorial-text text-navy/85">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
