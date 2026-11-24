import { describe, expect, it } from "vitest";

import {
  UNFILTERED_LIMIT,
  buildFilterHref,
  buildResponsesView,
  countByNegotiator,
  countByResponse,
  filterResponses,
  negotiatorKey,
  resolveResponseFilters,
  type ReactivationResponseRow,
} from "@/lib/reactivation/admin-filters";
import { OWNER_RESPONSE_LABELS } from "@/lib/reactivation/model";

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

  it("avec un filtre : toutes les lignes correspondantes, avec « N réponses »", () => {
    const rows = Array.from({ length: 120 }, (_, rank) => make(rank, { negotiator: rank % 3 === 0 ? "Yoann Uzzan" : "Jordan Saiman" }));
    const view = buildResponsesView(rows, { negotiator: "jordan" });
    expect(view.active).toBe(true);
    expect(view.limited).toBe(false);
    expect(view.rows).toHaveLength(80);
    expect(view.summary).toBe("80 réponses");
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
    expect(buildResponsesView(sample(), { response: "vendre" }).summary).toBe("1 réponse");
    expect(buildResponsesView(sample(), { response: "vendre", negotiator: "yoann" }).summary).toBe("0 réponse");
    expect(buildResponsesView([], {}).summary).toBe("0 réponse");
  });

  it("construit les puces « Réponse » dans l'ordre demandé, avec des compteurs croisés", () => {
    const rows = sample();
    const view = buildResponsesView(rows, { negotiator: "jordan" });
    expect(view.responseChips.map((chip) => [chip.key, chip.count, chip.active])).toEqual([
      ["toutes", 4, true],
      ["vendre", 1, false],
      ["valeur", 1, false],
      ["garde", 1, false],
      ["vendu", 0, false],
      ["stop", 1, false],
    ]);
    expect(view.responseChips[1]).toMatchObject({
      label: OWNER_RESPONSE_LABELS.vendre,
      href: "/admin/reactivation?reponse=vendre&negociateur=jordan",
    });
    expect(view.responseChips[0].href).toBe("/admin/reactivation?negociateur=jordan");
  });

  it("construit les puces « Négociateur » et marque celle qui est active", () => {
    const rows = sample();
    const view = buildResponsesView(rows, { response: "stop", negotiator: "jordan" });
    expect(view.negotiatorChips.map((chip) => [chip.key, chip.label, chip.count, chip.active])).toEqual([
      ["tous", "Tous", 2, false],
      ["jordan saiman", "Jordan Saiman", 1, true],
      ["yoann uzzan", "Yoann Uzzan", 1, false],
      ["aucun", "Sans négociateur", 0, false],
    ]);
    expect(view.negotiatorChips[2].href).toBe("/admin/reactivation?reponse=stop&negociateur=yoann+uzzan");
    expect(view.negotiatorChips[0].href).toBe("/admin/reactivation?reponse=stop");
    expect(view.rows.map((row) => row.id)).toEqual(["contact-0005"]);
  });
});
