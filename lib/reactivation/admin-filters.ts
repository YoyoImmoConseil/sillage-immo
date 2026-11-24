import {
  REACTIVATION_SEGMENTS,
  isOwnerResponse,
  isReactivationSegment,
  type OwnerResponse,
  type ReactivationSegment,
} from "@/lib/reactivation/model";

/**
 * Barre de filtres du tableau « Dernières réponses » de /admin/reactivation.
 *
 * Tout est pur (aucun accès base, aucun état) : la page charge toutes les
 * réponses, lit les paramètres d'URL et délègue ici le filtrage, le tri, les
 * compteurs des puces et la construction des liens.
 *
 * Paramètres d'URL :
 * - `reponse`, `negociateur`, `segment` : les filtres ;
 * - `tri` : `ancien` pour les plus anciennes d'abord (sinon les plus récentes) ;
 * - `ouvert` : le critère dont le panneau est déplié (`reponse`,
 *   `negociateur`, `segment`, `tri`), ou `aucun` pour tout replier.
 * Une valeur inconnue est ignorée.
 */

/** Une réponse reçue, telle que l'admin l'affiche. */
export type ReactivationResponseRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  segment: string;
  /** Statut de la fiche : distingue « a répondu » (responded) de « désinscrit » (unsubscribed). */
  status: string;
  response: string | null;
  respondedAt: string | null;
  sellerLeadId: string | null;
  negotiator: string | null;
};

export const REACTIVATION_ADMIN_PATH = "/admin/reactivation";
export const RESPONSE_PARAM = "reponse";
export const NEGOTIATOR_PARAM = "negociateur";
export const SEGMENT_PARAM = "segment";
export const SORT_PARAM = "tri";
export const OPEN_PARAM = "ouvert";

/** Valeur de `negociateur` qui désigne les réponses sans négociateur renseigné. */
export const NO_NEGOTIATOR_VALUE = "aucun";
export const NO_NEGOTIATOR_LABEL = "Sans négociateur";
const ALL_NEGOTIATORS_VALUE = "tous";

/** Les critères de la barre, et les panneaux qu'on peut déplier (critères + tri). */
export type ResponseFacetId = "reponse" | "negociateur" | "segment";
export type ResponsePanel = ResponseFacetId | "tri";
/** Valeur de `ouvert` qui replie tous les panneaux. */
export const CLOSED_PANEL_VALUE = "aucun";

export type ResponseSort = "recent" | "ancien";
export const DEFAULT_RESPONSE_SORT: ResponseSort = "recent";

/** Sans filtre, le tableau s'arrête à 50 réponses. */
export const UNFILTERED_LIMIT = 50;

/** Ordre d'affichage des puces « Réponse » (des plus chaudes aux désinscriptions). */
export const RESPONSE_CHIP_ORDER: readonly OwnerResponse[] = [
  "vendre",
  "valeur",
  "rappel",
  "visio",
  "cherche",
  "vendu_cherche",
  "garde",
  "vendu",
  "stop",
];

/** Libellés courts des puces ; la phrase complète du propriétaire reste dans le tableau. */
export const RESPONSE_SHORT_LABELS: Record<OwnerResponse, string> = {
  vendre: "Vend",
  valeur: "Valeur",
  rappel: "Rappel",
  visio: "Visio",
  cherche: "Cherche",
  vendu_cherche: "Vendu et cherche",
  garde: "Garde",
  vendu: "Vendu",
  stop: "Stop",
};

export const SEGMENT_SHORT_LABELS: Record<ReactivationSegment, string> = {
  v1_proprietaire: "Propriétaires",
  v3_client: "Clients vendeurs",
  a1_acquereur: "Acquéreurs",
  a2_ancien: "Anciens prospects",
};

const SORT_LABELS: Record<ResponseSort, { short: string; long: string }> = {
  recent: { short: "Plus récentes", long: "Plus récentes d'abord" },
  ancien: { short: "Plus anciennes", long: "Plus anciennes d'abord" },
};

/** Valeurs brutes lues dans l'URL (chaîne, tableau si le paramètre est répété, ou absent). */
export type ResponseFilterInput = {
  response?: unknown;
  negotiator?: unknown;
  segment?: unknown;
  sort?: unknown;
  open?: unknown;
};

/** Filtres résolus : seules les valeurs reconnues sont conservées. */
export type ResponseFilters = {
  response: OwnerResponse | null;
  segment: ReactivationSegment | null;
  /** Texte demandé, normalisé : sert à reconstruire les liens. Null : pas de filtre. */
  negotiator: string | null;
  /** Clés de négociateur retenues par le filtre (ensemble vide : pas de filtre). */
  negotiatorKeys: ReadonlySet<string>;
};

/** Sans casse, sans accents, espaces réduits. */
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const textOf = (value: unknown): string => {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? fold(first) : "";
};

/** Clé de regroupement d'un négociateur ; chaîne vide quand il n'est pas renseigné. */
export const negotiatorKey = (value: string | null | undefined): string => fold(value ?? "");

/**
 * Lit les filtres demandés. `reponse` et `segment` doivent être des clés
 * connues. `negociateur` est un texte libre : s'il est égal au nom d'un
 * négociateur présent parmi les réponses, il ne retient que celui-ci ;
 * sinon il retient tous ceux dont le nom le contient (« jordan »). S'il ne
 * correspond à personne, il est ignoré comme toute valeur inconnue.
 */
export const resolveResponseFilters = (
  rows: readonly ReactivationResponseRow[],
  input: ResponseFilterInput
): ResponseFilters => {
  const response = textOf(input.response);
  const segment = textOf(input.segment);
  const wanted = textOf(input.negotiator);

  let negotiator: string | null = null;
  let negotiatorKeys: ReadonlySet<string> = new Set<string>();
  if (wanted && wanted !== ALL_NEGOTIATORS_VALUE) {
    const known = new Set(rows.map((row) => negotiatorKey(row.negotiator)));
    let matches: string[];
    if (wanted === NO_NEGOTIATOR_VALUE) {
      matches = known.has("") ? [""] : [];
    } else if (known.has(wanted)) {
      matches = [wanted];
    } else {
      matches = [...known].filter((key) => key !== "" && key.includes(wanted));
    }
    if (matches.length > 0) {
      negotiator = wanted;
      negotiatorKeys = new Set(matches);
    }
  }

  return {
    response: isOwnerResponse(response) ? response : null,
    segment: isReactivationSegment(segment) ? segment : null,
    negotiator,
    negotiatorKeys,
  };
};

export const hasActiveFilter = (filters: ResponseFilters): boolean =>
  Boolean(filters.response || filters.segment || filters.negotiator);

/** Applique des filtres déjà résolus, sans changer l'ordre des lignes. */
export const applyResponseFilters = (
  rows: readonly ReactivationResponseRow[],
  filters: ResponseFilters
): ReactivationResponseRow[] =>
  rows.filter(
    (row) =>
      (!filters.response || row.response === filters.response) &&
      (!filters.segment || row.segment === filters.segment) &&
      (filters.negotiatorKeys.size === 0 || filters.negotiatorKeys.has(negotiatorKey(row.negotiator)))
  );

/** Filtre les réponses d'après les valeurs brutes de l'URL (valeurs inconnues ignorées). */
export const filterResponses = (
  rows: readonly ReactivationResponseRow[],
  input: ResponseFilterInput
): ReactivationResponseRow[] => applyResponseFilters(rows, resolveResponseFilters(rows, input));

/**
 * Compteurs des puces « Réponse » : calculés après application des filtres
 * négociateur et segment, mais pas du filtre réponse lui-même.
 */
export const countByResponse = (
  rows: readonly ReactivationResponseRow[],
  filters: ResponseFilters
): { total: number; counts: Partial<Record<OwnerResponse, number>> } => {
  const scope = applyResponseFilters(rows, { ...filters, response: null });
  const counts: Partial<Record<OwnerResponse, number>> = {};
  for (const row of scope) {
    if (isOwnerResponse(row.response)) counts[row.response] = (counts[row.response] ?? 0) + 1;
  }
  return { total: scope.length, counts };
};

export type NegotiatorGroup = {
  /** Clé de regroupement ; chaîne vide pour « sans négociateur ». */
  key: string;
  /** Graphie la plus fréquente parmi toutes les réponses. */
  label: string;
  count: number;
};

/**
 * Compteurs des puces « Négociateur » : calculés après application des
 * filtres réponse et segment, mais pas du filtre négociateur lui-même. Les
 * groupes, leur libellé et leur ordre viennent de toutes les réponses, pour
 * que les puces restent stables d'un filtre à l'autre.
 */
export const countByNegotiator = (
  rows: readonly ReactivationResponseRow[],
  filters: ResponseFilters
): { total: number; groups: NegotiatorGroup[] } => {
  const overall = new Map<string, number>();
  const spellings = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const key = negotiatorKey(row.negotiator);
    overall.set(key, (overall.get(key) ?? 0) + 1);
    const spelling = (row.negotiator ?? "").trim().replace(/\s+/g, " ");
    const bucket = spellings.get(key) ?? new Map<string, number>();
    bucket.set(spelling, (bucket.get(spelling) ?? 0) + 1);
    spellings.set(key, bucket);
  }

  const scope = applyResponseFilters(rows, { ...filters, negotiator: null, negotiatorKeys: new Set<string>() });
  const counts = new Map<string, number>();
  for (const row of scope) {
    const key = negotiatorKey(row.negotiator);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const groups: NegotiatorGroup[] = [...overall.keys()].map((key) => {
    let label = NO_NEGOTIATOR_LABEL;
    if (key !== "") {
      let best = 0;
      for (const [spelling, occurrences] of spellings.get(key) ?? []) {
        if (occurrences > best) {
          best = occurrences;
          label = spelling;
        }
      }
    }
    return { key, label, count: counts.get(key) ?? 0 };
  });
  groups.sort((a, b) => {
    if ((a.key === "") !== (b.key === "")) return a.key === "" ? 1 : -1;
    const diff = (overall.get(b.key) ?? 0) - (overall.get(a.key) ?? 0);
    return diff !== 0 ? diff : a.label.localeCompare(b.label, "fr");
  });
  return { total: scope.length, groups };
};

/**
 * Compteurs des puces « Segment » : calculés après application des filtres
 * réponse et négociateur, mais pas du filtre segment lui-même.
 */
export const countBySegment = (
  rows: readonly ReactivationResponseRow[],
  filters: ResponseFilters
): { total: number; counts: Partial<Record<ReactivationSegment, number>> } => {
  const scope = applyResponseFilters(rows, { ...filters, segment: null });
  const counts: Partial<Record<ReactivationSegment, number>> = {};
  for (const row of scope) {
    if (isReactivationSegment(row.segment)) counts[row.segment] = (counts[row.segment] ?? 0) + 1;
  }
  return { total: scope.length, counts };
};

/** Ce qu'un lien de la barre doit porter dans l'adresse. */
export type ResponseLinkState = {
  response: OwnerResponse | null;
  negotiator: string | null;
  segment: ReactivationSegment | null;
  /** Tri ; absent ou « recent » : rien dans l'adresse. */
  sort?: ResponseSort;
  /** Panneau à déplier, ou « aucun » pour tout replier ; absent : état par défaut. */
  open?: ResponsePanel | typeof CLOSED_PANEL_VALUE | null;
};

/**
 * État par défaut des panneaux, quand l'adresse ne dit rien : « Réponse » est
 * déplié tant qu'aucun filtre n'est choisi (les compteurs se lisent sans un
 * clic), tout est replié dès qu'un filtre est actif.
 */
const defaultPanel = (filtered: boolean): ResponsePanel | typeof CLOSED_PANEL_VALUE =>
  filtered ? CLOSED_PANEL_VALUE : "reponse";

/**
 * Lien vers la même page, avec une partie de l'état modifiée et le reste
 * conservé. `ouvert` n'est écrit que s'il diffère de l'état par défaut.
 */
export const buildFilterHref = (
  state: ResponseLinkState,
  patch: Partial<ResponseLinkState> = {},
  basePath: string = REACTIVATION_ADMIN_PATH
): string => {
  const next: ResponseLinkState = {
    response: state.response,
    negotiator: state.negotiator,
    segment: state.segment,
    sort: state.sort,
    open: state.open,
    ...patch,
  };
  const query = new URLSearchParams();
  if (next.response) query.set(RESPONSE_PARAM, next.response);
  if (next.negotiator) query.set(NEGOTIATOR_PARAM, next.negotiator);
  if (next.segment) query.set(SEGMENT_PARAM, next.segment);
  if (next.sort && next.sort !== DEFAULT_RESPONSE_SORT) query.set(SORT_PARAM, next.sort);
  const filtered = Boolean(next.response || next.negotiator || next.segment);
  if (next.open && next.open !== defaultPanel(filtered)) query.set(OPEN_PARAM, next.open);
  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
};

/** Une puce d'un panneau : une valeur, son compteur, et le lien qui l'applique. */
export type FacetOption = {
  key: string;
  label: string;
  count: number;
  selected: boolean;
  href: string;
};

/** Un critère de la barre. */
export type ResponseFacet = {
  id: ResponseFacetId;
  label: string;
  /** Libellé de la valeur choisie ; null tant que le critère ne filtre rien. */
  value: string | null;
  /** Vrai quand le panneau de ce critère est déplié. */
  open: boolean;
  /** Déplie le panneau, ou le replie s'il est déjà déplié. */
  toggleHref: string;
  /** Retire ce filtre ; null tant que le critère ne filtre rien. */
  clearHref: string | null;
  options: FacetOption[];
};

export type ResponseSortOption = {
  key: ResponseSort;
  label: string;
  selected: boolean;
  href: string;
};

export type ResponseSortView = {
  value: ResponseSort;
  /** Libellé du bouton : « Plus récentes » ou « Plus anciennes ». */
  label: string;
  open: boolean;
  toggleHref: string;
  options: ResponseSortOption[];
};

export type ResponsesView = {
  filters: ResponseFilters;
  /** Vrai dès qu'un filtre reconnu est appliqué. */
  active: boolean;
  sort: ResponseSortView;
  /**
   * Critères affichés. « Réponse » l'est toujours ; « Négociateur » et
   * « Segment » seulement s'ils offrent un choix (au moins deux valeurs) ou
   * s'ils filtrent déjà.
   */
  facets: ResponseFacet[];
  /** Panneau déplié sous la barre, ou null. */
  openPanel: ResponsePanel | null;
  /** Lignes à afficher : toutes les correspondances avec filtre, 50 au plus sans. */
  rows: ReactivationResponseRow[];
  /** Nombre de réponses qui correspondent aux filtres. */
  matching: number;
  /** Nombre total de réponses reçues. */
  total: number;
  /** Vrai quand l'affichage est tronqué à 50 lignes. */
  limited: boolean;
  /** « 39 réponses », « 12 réponses sur 39 », ou « 50 dernières sur 120 ». */
  summary: string;
  /** Retire tous les filtres, en gardant le tri. */
  resetHref: string;
};

/** « 1 réponse », « 12 réponses ». */
export const formatResponseCount = (count: number) => `${count} réponse${count > 1 ? "s" : ""}`;

const resolveSort = (value: unknown): ResponseSort => (textOf(value) === "ancien" ? "ancien" : DEFAULT_RESPONSE_SORT);

const resolveOpenPanel = (
  value: unknown,
  filtered: boolean,
  facets: readonly ResponseFacetId[]
): ResponsePanel | null => {
  const wanted = textOf(value);
  if (wanted === CLOSED_PANEL_VALUE) return null;
  if (wanted === "tri") return "tri";
  const facet = facets.find((id) => id === wanted);
  if (facet) return facet;
  const fallback = defaultPanel(filtered);
  return fallback === CLOSED_PANEL_VALUE ? null : fallback;
};

/** Tout ce dont la page a besoin pour afficher la barre de filtres et le tableau. */
export const buildResponsesView = (
  rows: readonly ReactivationResponseRow[],
  input: ResponseFilterInput,
  basePath: string = REACTIVATION_ADMIN_PATH
): ResponsesView => {
  const filters = resolveResponseFilters(rows, input);
  const active = hasActiveFilter(filters);
  const sortValue = resolveSort(input.sort);
  const base: ResponseLinkState = {
    response: filters.response,
    negotiator: filters.negotiator,
    segment: filters.segment,
    sort: sortValue,
  };
  const href = (patch: Partial<ResponseLinkState> = {}) => buildFilterHref(base, patch, basePath);

  // Les réponses arrivent de la plus récente à la plus ancienne.
  const matchingRows = applyResponseFilters(rows, filters);
  const ordered = sortValue === "ancien" ? [...matchingRows].reverse() : matchingRows;
  const limited = !active && ordered.length > UNFILTERED_LIMIT;

  // Choisir une valeur referme le panneau ; choisir « Toutes » le laisse déplié,
  // pour enchaîner sur une autre valeur.
  const byResponse = countByResponse(rows, filters);
  const presentResponses = new Set(rows.map((row) => row.response));
  const responseOptions: FacetOption[] = [
    {
      key: "toutes",
      label: "Toutes",
      count: byResponse.total,
      selected: filters.response === null,
      href: href({ response: null, open: "reponse" }),
    },
    ...RESPONSE_CHIP_ORDER.filter((response) => presentResponses.has(response) || filters.response === response).map(
      (response) => ({
        key: response,
        label: RESPONSE_SHORT_LABELS[response],
        count: byResponse.counts[response] ?? 0,
        selected: filters.response === response,
        href: href({ response }),
      })
    ),
  ];

  const byNegotiator = countByNegotiator(rows, filters);
  const negotiatorOptions: FacetOption[] = [
    {
      key: "tous",
      label: "Tous",
      count: byNegotiator.total,
      selected: filters.negotiator === null,
      href: href({ negotiator: null, open: "negociateur" }),
    },
    ...byNegotiator.groups.map((group) => ({
      key: group.key === "" ? NO_NEGOTIATOR_VALUE : group.key,
      label: group.label,
      count: group.count,
      selected: filters.negotiatorKeys.has(group.key),
      href: href({ negotiator: group.key === "" ? NO_NEGOTIATOR_VALUE : group.key }),
    })),
  ];
  let negotiatorValue: string | null = null;
  if (filters.negotiator) {
    const [onlyKey] = filters.negotiatorKeys;
    negotiatorValue =
      filters.negotiatorKeys.size === 1
        ? (byNegotiator.groups.find((group) => group.key === onlyKey)?.label ?? filters.negotiator)
        : `« ${filters.negotiator} »`;
  }

  const bySegment = countBySegment(rows, filters);
  const presentSegments = new Set(rows.map((row) => row.segment));
  const segments = REACTIVATION_SEGMENTS.filter((segment) => presentSegments.has(segment) || filters.segment === segment);
  const segmentOptions: FacetOption[] = [
    {
      key: "tous",
      label: "Tous",
      count: bySegment.total,
      selected: filters.segment === null,
      href: href({ segment: null, open: "segment" }),
    },
    ...segments.map((segment) => ({
      key: segment,
      label: SEGMENT_SHORT_LABELS[segment],
      count: bySegment.counts[segment] ?? 0,
      selected: filters.segment === segment,
      href: href({ segment }),
    })),
  ];

  const drafts: Array<Omit<ResponseFacet, "open" | "toggleHref">> = [
    {
      id: "reponse",
      label: "Réponse",
      value: filters.response ? RESPONSE_SHORT_LABELS[filters.response] : null,
      clearHref: filters.response ? href({ response: null }) : null,
      options: responseOptions,
    },
  ];
  if (byNegotiator.groups.length > 1 || filters.negotiator) {
    drafts.push({
      id: "negociateur",
      label: "Négociateur",
      value: negotiatorValue,
      clearHref: filters.negotiator ? href({ negotiator: null }) : null,
      options: negotiatorOptions,
    });
  }
  if (segments.length > 1 || filters.segment) {
    drafts.push({
      id: "segment",
      label: "Segment",
      value: filters.segment ? SEGMENT_SHORT_LABELS[filters.segment] : null,
      clearHref: filters.segment ? href({ segment: null }) : null,
      options: segmentOptions,
    });
  }

  const openPanel = resolveOpenPanel(
    input.open,
    active,
    drafts.map((draft) => draft.id)
  );
  const toggleHref = (panel: ResponsePanel) => href({ open: openPanel === panel ? CLOSED_PANEL_VALUE : panel });

  let summary = formatResponseCount(ordered.length);
  if (limited) {
    summary = `${UNFILTERED_LIMIT} ${sortValue === "ancien" ? "plus anciennes" : "dernières"} sur ${rows.length}`;
  } else if (active) {
    summary = `${summary} sur ${rows.length}`;
  }

  return {
    filters,
    active,
    sort: {
      value: sortValue,
      label: SORT_LABELS[sortValue].short,
      open: openPanel === "tri",
      toggleHref: toggleHref("tri"),
      options: (["recent", "ancien"] as const).map((key) => ({
        key,
        label: SORT_LABELS[key].long,
        selected: key === sortValue,
        href: href({ sort: key }),
      })),
    },
    facets: drafts.map((draft) => ({ ...draft, open: openPanel === draft.id, toggleHref: toggleHref(draft.id) })),
    openPanel,
    rows: limited ? ordered.slice(0, UNFILTERED_LIMIT) : ordered,
    matching: ordered.length,
    total: rows.length,
    limited,
    summary,
    resetHref: buildFilterHref({ response: null, negotiator: null, segment: null, sort: sortValue }, {}, basePath),
  };
};
