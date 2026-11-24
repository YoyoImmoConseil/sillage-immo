import { describe, expect, it } from "vitest";

import {
  UNFILTERED_LIMIT,
  buildFilterHref,
  buildResponsesView,
  countByNegotiator,
  countByResponse,
  countBySegment,
  filterResponses,
  negotiatorKey,
  resolveResponseFilters,
  type ReactivationResponseRow,
  type ResponsesView,
} from "@/lib/reactivation/admin-filters";

/** Fabrique une réponse ; `rank` croissant = réponse plus ancienne (les jeux sont donc triés du plus récent au plus ancien). */
const make = (rank: number, overrides: Partial<ReactivationResponseRow> = {}): ReactivationResponseRow => ({
  id: `contact-${String(rank).padStart(4, "0")}`,
  fullName: `Contact ${rank}`,
  email: `contact${rank}@example.com`,
  phone: null,
  segment: "v1_proprietaire",
  status: "responded",
  response: "garde",
  respondedAt: new Date(Date.UTC(2026, 10, 20, 12, 0, 0) - rank * 60_000).toISOString(),
  sellerLeadId: null,
  negotiator: "Yoann Uzzan",
  ...overrides,
});

const sample = (): ReactivationResponseRow[] => [
  make(0, { response: "vendre", negotiator: "Jordan Saiman", sellerLeadId: "lead-1" }),
  make(1, { response: "stop", status: "unsubscribed", negotiator: "Yoann Uzzan" }),
  make(2, { response: "garde", negotiator: "JORDAN SAIMAN" }),
  make(3, { response: "vendu", negotiator: "Yoann UZZAN", segment: "a2_ancien" }),
  make(4, { response: "valeur", negotiator: " jordan  saiman ", sellerLeadId: "lead-2" }),
  make(5, { response: "stop", status: "unsubscribed", negotiator: "Jordan Saiman" }),
  make(6, { response: "garde", negotiator: "Yoann Uzzan" }),
  make(7, { response: "vendu", negotiator: null }),
];

const ids = (rows: ReactivationResponseRow[]) => rows.map((row) => row.id);

const facet = (view: ResponsesView, id: string) => {
  const found = view.facets.find((item) => item.id === id);
  if (!found) throw new Error(`critère absent : ${id}`);
  return found;
};

describe("filterResponses", () => {
  it("filtre par réponse", () => {
    const rows = sample();
    expect(ids(filterResponses(rows, { response: "stop" }))).toEqual(["contact-0001", "contact-0005"]);
    expect(ids(filterResponses(rows, { response: "vendre" }))).toEqual(["contact-0000"]);
  });

  it("filtre par négociateur sans tenir compte de la casse ni des espaces", () => {
    const rows = sample();
    const expected = ["contact-0000", "contact-0002", "contact-0004", "contact-0005"];
    expect(ids(filterResponses(rows, { negotiator: "jordan saiman" }))).toEqual(expected);
    expect(ids(filterResponses(rows, { negotiator: "JORDAN  Saiman " }))).toEqual(expected);
    // Texte libre : un prénom suffit.
    expect(ids(filterResponses(rows, { negotiator: "jordan" }))).toEqual(expected);
    expect(ids(filterResponses(rows, { negotiator: "Jordan" }))).toEqual(expected);
  });

  it("un nom exact ne déborde pas sur un nom qui le contient", () => {
    const rows = [make(0, { negotiator: "Laura" }), make(1, { negotiator: "Laura Zeisser" }), make(2, { negotiator: "laura" })];
    expect(ids(filterResponses(rows, { negotiator: "laura" }))).toEqual(["contact-0000", "contact-0002"]);
    expect(ids(filterResponses(rows, { negotiator: "zeisser" }))).toEqual(["contact-0001"]);
    expect(ids(filterResponses(rows, { negotiator: "lau" }))).toEqual(["contact-0000", "contact-0001", "contact-0002"]);
  });

  it("filtre les réponses sans négociateur avec « aucun »", () => {
    expect(ids(filterResponses(sample(), { negotiator: "aucun" }))).toEqual(["contact-0007"]);
  });

  it("filtre par segment", () => {
    expect(ids(filterResponses(sample(), { segment: "a2_ancien" }))).toEqual(["contact-0003"]);
  });

  it("combine les filtres", () => {
    const rows = sample();
    expect(ids(filterResponses(rows, { response: "stop", negotiator: "jordan" }))).toEqual(["contact-0005"]);
    expect(ids(filterResponses(rows, { response: "vendu", negotiator: "yoann uzzan", segment: "a2_ancien" }))).toEqual(["contact-0003"]);
    // Combinaison valide mais sans résultat : aucune ligne, pas un retour à « toutes ».
    expect(filterResponses(rows, { response: "vendre", negotiator: "yoann" })).toEqual([]);
  });

  it("ignore les valeurs inconnues", () => {
    const rows = sample();
    const all = ids(rows);
    expect(ids(filterResponses(rows, {}))).toEqual(all);
    expect(ids(filterResponses(rows, { response: "toutes", negotiator: "tous", segment: "tous" }))).toEqual(all);
    expect(ids(filterResponses(rows, { response: "nimporte" }))).toEqual(all);
    expect(ids(filterResponses(rows, { segment: "v9_inconnu" }))).toEqual(all);
    expect(ids(filterResponses(rows, { negotiator: "personne de ce nom" }))).toEqual(all);
    expect(ids(filterResponses(rows, { response: 42, negotiator: null, segment: undefined }))).toEqual(all);
    // Une valeur inconnue n'annule pas les filtres valides qui l'accompagnent.
    expect(ids(filterResponses(rows, { response: "stop", segment: "v9_inconnu" }))).toEqual(["contact-0001", "contact-0005"]);
  });

  it("prend la première valeur d'un paramètre répété", () => {
    expect(ids(filterResponses(sample(), { response: ["vendre", "stop"] }))).toEqual(["contact-0000"]);
  });

  it("conserve l'ordre du plus récent au plus ancien", () => {
    const rows = Array.from({ length: 30 }, (_, rank) => make(rank, { negotiator: rank % 3 === 0 ? "Jordan Saiman" : "Yoann Uzzan" }));
    const filtered = filterResponses(rows, { negotiator: "jordan" });
    expect(filtered).toHaveLength(10);
    const dates = filtered.map((row) => row.respondedAt ?? "");
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
    expect(ids(filtered)).toEqual(ids(rows.filter((_, rank) => rank % 3 === 0)));
  });
});

describe("resolveResponseFilters", () => {
  it("ne garde que les valeurs reconnues", () => {
    const filters = resolveResponseFilters(sample(), { response: "VENDRE", negotiator: "Jordan", segment: "nimporte" });
    expect(filters.response).toBe("vendre");
    expect(filters.segment).toBeNull();
    expect(filters.negotiator).toBe("jordan");
    expect([...filters.negotiatorKeys]).toEqual(["jordan saiman"]);
  });

  it("regroupe les graphies d'un même négociateur", () => {
    expect(negotiatorKey(" JORDAN  Saiman ")).toBe("jordan saiman");
    expect(negotiatorKey("Jérôme Dupré")).toBe("jerome dupre");
    expect(negotiatorKey(null)).toBe("");
  });
});

describe("compteurs des puces", () => {
  it("compte les réponses après le filtre négociateur et segment, pas après le filtre réponse", () => {
    const rows = sample();
    const none = countByResponse(rows, resolveResponseFilters(rows, {}));
    expect(none.total).toBe(8);
    expect(none.counts).toEqual({ vendre: 1, stop: 2, garde: 2, vendu: 2, valeur: 1 });

    const jordan = countByResponse(rows, resolveResponseFilters(rows, { negotiator: "jordan", response: "stop" }));
    expect(jordan.total).toBe(4);
    expect(jordan.counts).toEqual({ vendre: 1, garde: 1, valeur: 1, stop: 1 });

    const ancien = countByResponse(rows, resolveResponseFilters(rows, { segment: "a2_ancien" }));
    expect(ancien.total).toBe(1);
    expect(ancien.counts).toEqual({ vendu: 1 });
  });

  it("compte les négociateurs après le filtre réponse et segment, pas après le filtre négociateur", () => {
    const rows = sample();
    const none = countByNegotiator(rows, resolveResponseFilters(rows, {}));
    expect(none.total).toBe(8);
    expect(none.groups).toEqual([
      { key: "jordan saiman", label: "Jordan Saiman", count: 4 },
      { key: "yoann uzzan", label: "Yoann Uzzan", count: 3 },
      { key: "", label: "Sans négociateur", count: 1 },
    ]);

    const stop = countByNegotiator(rows, resolveResponseFilters(rows, { response: "stop", negotiator: "jordan" }));
    expect(stop.total).toBe(2);
    expect(stop.groups.map((group) => [group.label, group.count])).toEqual([
      ["Jordan Saiman", 1],
      ["Yoann Uzzan", 1],
      ["Sans négociateur", 0],
    ]);
  });

  it("affiche la graphie la plus fréquente", () => {
    const rows = [
      make(0, { negotiator: "yoann uzzan" }),
      make(1, { negotiator: "Yoann UZZAN" }),
      make(2, { negotiator: "Yoann UZZAN" }),
      make(3, { negotiator: "Yoann Uzzan" }),
    ];
    const { groups } = countByNegotiator(rows, resolveResponseFilters(rows, {}));
    expect(groups).toEqual([{ key: "yoann uzzan", label: "Yoann UZZAN", count: 4 }]);
  });

  it("compte les segments après le filtre réponse et négociateur, pas après le filtre segment", () => {
    const rows = sample();
    const none = countBySegment(rows, resolveResponseFilters(rows, {}));
    expect(none.total).toBe(8);
    expect(none.counts).toEqual({ v1_proprietaire: 7, a2_ancien: 1 });

    const vendu = countBySegment(rows, resolveResponseFilters(rows, { response: "vendu", segment: "a2_ancien" }));
    expect(vendu.total).toBe(2);
    expect(vendu.counts).toEqual({ v1_proprietaire: 1, a2_ancien: 1 });
  });
});

describe("buildFilterHref", () => {
  const none = { response: null, negotiator: null, segment: null };

  it("met à jour un paramètre et conserve les autres", () => {
    expect(buildFilterHref(none)).toBe("/admin/reactivation");
    expect(buildFilterHref(none, { response: "vendre" })).toBe("/admin/reactivation?reponse=vendre");
    expect(buildFilterHref({ response: "stop", negotiator: "jordan saiman", segment: "v1_proprietaire" }, { response: "vendu" })).toBe(
      "/admin/reactivation?reponse=vendu&negociateur=jordan+saiman&segment=v1_proprietaire"
    );
    expect(buildFilterHref({ response: "stop", negotiator: "jordan", segment: null }, { response: null })).toBe(
      "/admin/reactivation?negociateur=jordan"
    );
  });

  it("n'écrit le tri que s'il n'est pas celui par défaut", () => {
    expect(buildFilterHref(none, { sort: "recent" })).toBe("/admin/reactivation");
    expect(buildFilterHref(none, { sort: "ancien" })).toBe("/admin/reactivation?tri=ancien");
    expect(buildFilterHref({ ...none, sort: "ancien" }, { response: "garde" })).toBe("/admin/reactivation?reponse=garde&tri=ancien");
  });

  it("n'écrit le panneau déplié que s'il diffère de l'état par défaut", () => {
    // Sans filtre, « Réponse » est déplié par défaut.
    expect(buildFilterHref(none, { open: "reponse" })).toBe("/admin/reactivation");
    expect(buildFilterHref(none, { open: "negociateur" })).toBe("/admin/reactivation?ouvert=negociateur");
    expect(buildFilterHref(none, { open: "aucun" })).toBe("/admin/reactivation?ouvert=aucun");
    // Avec un filtre, tout est replié par défaut.
    expect(buildFilterHref({ ...none, response: "vendu" }, { open: "aucun" })).toBe("/admin/reactivation?reponse=vendu");
    expect(buildFilterHref({ ...none, response: "vendu" }, { open: "reponse" })).toBe("/admin/reactivation?reponse=vendu&ouvert=reponse");
    expect(buildFilterHref({ ...none, response: "vendu", sort: "ancien" }, { open: "tri" })).toBe(
      "/admin/reactivation?reponse=vendu&tri=ancien&ouvert=tri"
    );
  });
});

describe("buildResponsesView", () => {
  it("sans filtre : les 50 plus récentes, avec la mention « 50 dernières sur N »", () => {
    const rows = Array.from({ length: 120 }, (_, rank) => make(rank));
    const view = buildResponsesView(rows, {});
    expect(view.active).toBe(false);
    expect(view.limited).toBe(true);
    expect(view.rows).toHaveLength(UNFILTERED_LIMIT);
    expect(ids(view.rows)).toEqual(ids(rows.slice(0, 50)));
    expect(view.total).toBe(120);
    expect(view.matching).toBe(120);
    expect(view.summary).toBe("50 dernières sur 120");
  });

  it("avec un filtre : toutes les lignes correspondantes, avec « N réponses sur le total »", () => {
    const rows = Array.from({ length: 120 }, (_, rank) => make(rank, { negotiator: rank % 3 === 0 ? "Yoann Uzzan" : "Jordan Saiman" }));
    const view = buildResponsesView(rows, { negotiator: "jordan" });
    expect(view.active).toBe(true);
    expect(view.limited).toBe(false);
    expect(view.rows).toHaveLength(80);
    expect(view.matching).toBe(80);
    expect(view.summary).toBe("80 réponses sur 120");
    expect(view.resetHref).toBe("/admin/reactivation");
  });

  it("une valeur inconnue seule ne compte pas comme un filtre", () => {
    const rows = Array.from({ length: 60 }, (_, rank) => make(rank));
    const view = buildResponsesView(rows, { response: "nimporte", negotiator: "personne", segment: "ailleurs" });
    expect(view.active).toBe(false);
    expect(view.rows).toHaveLength(50);
    expect(view.summary).toBe("50 dernières sur 60");
  });

  it("accorde la mention au nombre de réponses", () => {
    expect(buildResponsesView(sample(), {}).summary).toBe("8 réponses");
    expect(buildResponsesView(sample(), { response: "vendre" }).summary).toBe("1 réponse sur 8");
    expect(buildResponsesView(sample(), { response: "vendre", negotiator: "yoann" }).summary).toBe("0 réponse sur 8");
    expect(buildResponsesView([], {}).summary).toBe("0 réponse");
  });
});

describe("critères de la barre", () => {
  it("« Réponse » : libellés courts, ordre demandé, compteurs croisés", () => {
    const view = buildResponsesView(sample(), { negotiator: "jordan" });
    const reponse = facet(view, "reponse");
    expect(reponse.label).toBe("Réponse");
    expect(reponse.value).toBeNull();
    expect(reponse.clearHref).toBeNull();
    expect(reponse.options.map((option) => [option.key, option.label, option.count, option.selected])).toEqual([
      ["toutes", "Toutes", 4, true],
      ["vendre", "Vend", 1, false],
      ["valeur", "Valeur", 1, false],
      ["garde", "Garde", 1, false],
      ["vendu", "Vendu", 0, false],
      ["stop", "Stop", 1, false],
    ]);
    // Choisir une valeur referme le panneau : rien à écrire, tout est replié dès qu'un filtre est actif.
    expect(reponse.options[1].href).toBe("/admin/reactivation?reponse=vendre&negociateur=jordan");
    // « Toutes » retire le filtre et laisse le panneau déplié.
    expect(reponse.options[0].href).toBe("/admin/reactivation?negociateur=jordan&ouvert=reponse");
  });

  it("« Négociateur » : la valeur choisie est affichée et peut être retirée", () => {
    const view = buildResponsesView(sample(), { response: "stop", negotiator: "jordan" });
    const negociateur = facet(view, "negociateur");
    expect(negociateur.value).toBe("Jordan Saiman");
    expect(negociateur.clearHref).toBe("/admin/reactivation?reponse=stop");
    expect(negociateur.options.map((option) => [option.key, option.label, option.count, option.selected])).toEqual([
      ["tous", "Tous", 2, false],
      ["jordan saiman", "Jordan Saiman", 1, true],
      ["yoann uzzan", "Yoann Uzzan", 1, false],
      ["aucun", "Sans négociateur", 0, false],
    ]);
    expect(negociateur.options[2].href).toBe("/admin/reactivation?reponse=stop&negociateur=yoann+uzzan");
    expect(negociateur.options[0].href).toBe("/admin/reactivation?reponse=stop&ouvert=negociateur");
    expect(facet(view, "reponse").value).toBe("Stop");
    expect(facet(view, "reponse").clearHref).toBe("/admin/reactivation?negociateur=jordan");
    expect(ids(view.rows)).toEqual(["contact-0005"]);
  });

  it("« Négociateur » : un texte libre qui retient plusieurs personnes est affiché tel quel", () => {
    const rows = [make(0, { negotiator: "Laura" }), make(1, { negotiator: "Laura Zeisser" }), make(2, { negotiator: "laura" })];
    const negociateur = facet(buildResponsesView(rows, { negotiator: "lau" }), "negociateur");
    expect(negociateur.value).toBe("« lau »");
    expect(negociateur.options.map((option) => [option.label, option.count, option.selected])).toEqual([
      ["Tous", 3, false],
      ["Laura", 2, true],
      ["Laura Zeisser", 1, true],
    ]);
  });

  it("« Segment » : compteurs croisés et libellés courts", () => {
    const view = buildResponsesView(sample(), { response: "vendu" });
    const segment = facet(view, "segment");
    expect(segment.value).toBeNull();
    expect(segment.options.map((option) => [option.key, option.label, option.count, option.selected])).toEqual([
      ["tous", "Tous", 2, true],
      ["v1_proprietaire", "Propriétaires", 1, false],
      ["a2_ancien", "Anciens prospects", 1, false],
    ]);
    expect(segment.options[2].href).toBe("/admin/reactivation?reponse=vendu&segment=a2_ancien");
  });

  it("une valeur choisie mais absente des réponses reste visible, à zéro", () => {
    const view = buildResponsesView(sample(), { response: "rappel" });
    expect(view.active).toBe(true);
    expect(view.rows).toEqual([]);
    expect(view.summary).toBe("0 réponse sur 8");
    const reponse = facet(view, "reponse");
    expect(reponse.value).toBe("Rappel");
    expect(reponse.options.map((option) => option.key)).toEqual(["toutes", "vendre", "valeur", "rappel", "garde", "vendu", "stop"]);
    expect(reponse.options[3]).toMatchObject({ count: 0, selected: true });
  });

  it("n'affiche « Négociateur » et « Segment » que s'ils offrent un choix ou filtrent déjà", () => {
    expect(buildResponsesView(sample(), {}).facets.map((item) => item.id)).toEqual(["reponse", "negociateur", "segment"]);

    // Un seul négociateur, un seul segment : il ne reste que « Réponse ».
    const rows = [make(0), make(1, { response: "stop" })];
    expect(buildResponsesView(rows, {}).facets.map((item) => item.id)).toEqual(["reponse"]);

    // Un filtre posé par l'adresse garde son critère affiché, pour qu'on puisse le retirer.
    const filtered = buildResponsesView(rows, { segment: "v1_proprietaire" });
    expect(filtered.facets.map((item) => item.id)).toEqual(["reponse", "segment"]);
    expect(facet(filtered, "segment").value).toBe("Propriétaires");
    expect(facet(filtered, "segment").clearHref).toBe("/admin/reactivation");
  });
});

describe("panneau déplié", () => {
  const opened = (view: ResponsesView) => view.facets.filter((item) => item.open).map((item) => item.id);

  it("à l'arrivée, « Réponse » est déplié", () => {
    const view = buildResponsesView(sample(), {});
    expect(view.openPanel).toBe("reponse");
    expect(opened(view)).toEqual(["reponse"]);
    expect(view.sort.open).toBe(false);
    // Le bouton déplié replie ; les autres déplient leur propre panneau.
    expect(facet(view, "reponse").toggleHref).toBe("/admin/reactivation?ouvert=aucun");
    expect(facet(view, "negociateur").toggleHref).toBe("/admin/reactivation?ouvert=negociateur");
    expect(view.sort.toggleHref).toBe("/admin/reactivation?ouvert=tri");
    // Choisir une valeur applique le filtre et replie.
    expect(facet(view, "reponse").options.find((option) => option.key === "vendu")?.href).toBe("/admin/reactivation?reponse=vendu");
  });

  it("dès qu'un filtre est actif, tout est replié", () => {
    const view = buildResponsesView(sample(), { response: "vendu" });
    expect(view.openPanel).toBeNull();
    expect(opened(view)).toEqual([]);
    expect(facet(view, "reponse").toggleHref).toBe("/admin/reactivation?reponse=vendu&ouvert=reponse");
    expect(facet(view, "reponse").clearHref).toBe("/admin/reactivation");
  });

  it("suit le paramètre « ouvert »", () => {
    const negociateur = buildResponsesView(sample(), { open: "negociateur" });
    expect(opened(negociateur)).toEqual(["negociateur"]);
    expect(facet(negociateur, "negociateur").toggleHref).toBe("/admin/reactivation?ouvert=aucun");
    expect(facet(negociateur, "reponse").toggleHref).toBe("/admin/reactivation");

    const closed = buildResponsesView(sample(), { open: "aucun" });
    expect(closed.openPanel).toBeNull();
    expect(facet(closed, "reponse").toggleHref).toBe("/admin/reactivation");

    const reopened = buildResponsesView(sample(), { response: "vendu", open: "reponse" });
    expect(opened(reopened)).toEqual(["reponse"]);
    expect(facet(reopened, "reponse").toggleHref).toBe("/admin/reactivation?reponse=vendu");

    const tri = buildResponsesView(sample(), { open: "tri" });
    expect(tri.openPanel).toBe("tri");
    expect(tri.sort.open).toBe(true);
    expect(opened(tri)).toEqual([]);
    expect(tri.sort.toggleHref).toBe("/admin/reactivation?ouvert=aucun");
  });

  it("ignore un panneau inconnu ou un critère qui n'est pas affiché", () => {
    expect(buildResponsesView(sample(), { open: "nimporte" }).openPanel).toBe("reponse");
    expect(buildResponsesView(sample(), { response: "vendu", open: "nimporte" }).openPanel).toBeNull();
    // Un seul segment : le critère « Segment » n'existe pas, on revient à l'état par défaut.
    expect(buildResponsesView([make(0), make(1)], { open: "segment" }).openPanel).toBe("reponse");
  });
});

describe("tri", () => {
  it("par défaut, les plus récentes d'abord", () => {
    const view = buildResponsesView(sample(), {});
    expect(view.sort.value).toBe("recent");
    expect(view.sort.label).toBe("Plus récentes");
    expect(ids(view.rows)).toEqual(ids(sample()));
    expect(view.sort.options).toEqual([
      { key: "recent", label: "Plus récentes d'abord", selected: true, href: "/admin/reactivation" },
      { key: "ancien", label: "Plus anciennes d'abord", selected: false, href: "/admin/reactivation?tri=ancien" },
    ]);
    expect(buildResponsesView(sample(), { sort: "nimporte" }).sort.value).toBe("recent");
  });

  it("« ancien » inverse l'ordre et reste dans tous les liens", () => {
    const view = buildResponsesView(sample(), { sort: "ancien", response: "stop" });
    expect(view.sort.value).toBe("ancien");
    expect(view.sort.label).toBe("Plus anciennes");
    expect(ids(view.rows)).toEqual(["contact-0005", "contact-0001"]);
    expect(view.resetHref).toBe("/admin/reactivation?tri=ancien");
    expect(facet(view, "reponse").clearHref).toBe("/admin/reactivation?tri=ancien");
    expect(facet(view, "reponse").options.find((option) => option.key === "garde")?.href).toBe(
      "/admin/reactivation?reponse=garde&tri=ancien"
    );
    expect(view.sort.options.map((option) => option.href)).toEqual([
      "/admin/reactivation?reponse=stop",
      "/admin/reactivation?reponse=stop&tri=ancien",
    ]);
  });

  it("sans filtre, « ancien » montre les 50 plus anciennes", () => {
    const rows = Array.from({ length: 120 }, (_, rank) => make(rank));
    const view = buildResponsesView(rows, { sort: "ancien" });
    expect(view.limited).toBe(true);
    expect(ids(view.rows)).toEqual(ids(rows.slice(70).reverse()));
    expect(view.summary).toBe("50 plus anciennes sur 120");
  });
});
