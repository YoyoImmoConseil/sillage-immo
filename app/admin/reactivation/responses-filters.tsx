import Link from "next/link";

import {
  formatResponseCount,
  type FacetOption,
  type ResponseFacet,
  type ResponseSortView,
  type ResponsesView,
} from "@/lib/reactivation/admin-filters";

/**
 * En-tête et barre de filtres du tableau « Dernières réponses ».
 *
 * Une seule barre : le tri, puis un bouton par critère. Un critère déplié
 * montre ses valeurs sous la barre, chacune avec son compteur ; un critère
 * réglé devient un bouton plein, avec sa valeur et une croix pour le retirer.
 * Tout est fait de liens : aucun JavaScript, aucun état côté navigateur.
 * Les liens ne sont pas préchargés : ils mènent tous à cette même page.
 */

const PANEL_ID = "reponses-filtre";

// Les liens portent sillage-btn / sillage-btn-secondary : ce sont ces classes qui les sortent du
// style générique des liens (coins, survol) défini dans globals.css. Les variantes sillage-filter*
// y sont définies juste à côté.
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
const pillBase = `sillage-btn-secondary sillage-filter inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm leading-none ${focusRing}`;
const pillClass = (open: boolean) => `${pillBase}${open ? " sillage-filter-open" : ""}`;

const Chevron = ({ up }: { up: boolean }) => (
  <svg aria-hidden="true" width="9" height="6" viewBox="0 0 9 6" className="shrink-0 opacity-70">
    <path
      d={up ? "M1 5l3.5-3.5L8 5" : "M1 1l3.5 3.5L8 1"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SortArrow = ({ up }: { up: boolean }) => (
  <svg aria-hidden="true" width="10" height="12" viewBox="0 0 10 12" className="shrink-0">
    <path
      d={up ? "M5 11V2M1.5 5.5L5 2l3.5 3.5" : "M5 1v9M1.5 6.5L5 10l3.5-3.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Cross = () => (
  <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
    <path d="M1 1l6 6M7 1L1 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

function SortButton({ sort }: { sort: ResponseSortView }) {
  return (
    <Link
      href={sort.toggleHref}
      scroll={false}
      prefetch={false}
      aria-expanded={sort.open}
      aria-controls={sort.open ? PANEL_ID : undefined}
      aria-label={`Tri : ${sort.label}`}
      className={pillClass(sort.open)}
    >
      <SortArrow up={sort.value === "ancien"} />
      {sort.label}
      <Chevron up={sort.open} />
    </Link>
  );
}

function FacetButton({ facet }: { facet: ResponseFacet }) {
  if (facet.value === null || facet.clearHref === null) {
    return (
      <Link
        href={facet.toggleHref}
        scroll={false}
        prefetch={false}
        aria-expanded={facet.open}
        aria-controls={facet.open ? PANEL_ID : undefined}
        className={pillClass(facet.open)}
      >
        {facet.label}
        <Chevron up={facet.open} />
      </Link>
    );
  }
  return (
    <span
      className={`inline-flex h-8 items-center whitespace-nowrap rounded-full text-sm leading-none${
        facet.open ? " outline-2 outline-offset-2 outline-navy/30" : ""
      }`}
    >
      <Link
        href={facet.toggleHref}
        scroll={false}
        prefetch={false}
        aria-expanded={facet.open}
        aria-controls={facet.open ? PANEL_ID : undefined}
        className={`sillage-btn sillage-filter-part inline-flex h-8 items-center rounded-l-full pl-3 pr-1.5 ${focusRing}`}
      >
        <span>
          {facet.label} : <strong className="font-semibold">{facet.value}</strong>
        </span>
      </Link>
      <Link
        href={facet.clearHref}
        scroll={false}
        prefetch={false}
        aria-label={`Retirer le filtre ${facet.label}`}
        className={`sillage-btn sillage-filter-part group inline-flex h-8 items-center rounded-r-full pl-0.5 pr-2 ${focusRing}`}
      >
        <span className="inline-flex size-[18px] items-center justify-center rounded-full border border-sand/60 group-hover:bg-sand/20">
          <Cross />
        </span>
      </Link>
    </span>
  );
}

/** Une valeur dans un panneau : pleine quand elle est choisie, atténuée quand elle ne donnerait aucune ligne. */
function OptionChip({ href, label, selected, count }: Pick<FacetOption, "href" | "label" | "selected"> & { count?: number }) {
  const counted = count !== undefined;
  const tone = selected
    ? "sillage-btn border border-transparent"
    : `sillage-btn-secondary sillage-filter-value${count === 0 ? " opacity-50" : ""}`;
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      aria-current={selected ? "true" : undefined}
      className={`${tone} inline-flex h-[30px] items-center gap-2 whitespace-nowrap rounded-full text-sm leading-none ${
        counted ? "pl-3 pr-1.5" : "px-3"
      } ${focusRing}`}
    >
      {label}
      {counted ? (
        <span
          className={`inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
            selected ? "bg-sand/20" : "bg-navy/10"
          }`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function ResponsesFilters({ view }: { view: ResponsesView }) {
  const openFacet = view.facets.find((facet) => facet.open);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2">
        <h2 className="sillage-section-title">Dernières réponses</h2>
        <p className="text-sm text-navy/70">
          {view.active ? (
            <>
              <strong className="font-semibold text-navy">{formatResponseCount(view.matching)}</strong> sur {view.total}
              {" · "}
              <Link href={view.resetHref} scroll={false} prefetch={false} className="underline underline-offset-2">
                Tout effacer
              </Link>
            </>
          ) : (
            view.summary
          )}
        </p>
      </div>

      {view.total > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-1">
            <SortButton sort={view.sort} />
            <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-navy/20 sm:block" />
            {view.facets.map((facet) => (
              <FacetButton key={facet.id} facet={facet} />
            ))}
          </div>

          {openFacet ? (
            <div id={PANEL_ID} className="mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-navy/5 px-3 py-2.5">
              <span className="mr-1 text-xs font-medium uppercase tracking-wide text-navy/60">{openFacet.label}</span>
              {openFacet.options.map((option) => (
                <OptionChip key={option.key} href={option.href} label={option.label} selected={option.selected} count={option.count} />
              ))}
            </div>
          ) : null}

          {view.sort.open ? (
            <div id={PANEL_ID} className="mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-navy/5 px-3 py-2.5">
              <span className="mr-1 text-xs font-medium uppercase tracking-wide text-navy/60">Trier</span>
              {view.sort.options.map((option) => (
                <OptionChip key={option.key} href={option.href} label={option.label} selected={option.selected} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
