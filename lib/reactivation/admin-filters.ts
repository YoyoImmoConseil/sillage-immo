import {
  OWNER_RESPONSE_LABELS,
  isOwnerResponse,
  isReactivationSegment,
  type OwnerResponse,
  type ReactivationSegment,
} from "@/lib/reactivation/model";

/**
 * Filtres du tableau « Dernières réponses » de /admin/reactivation.
 *
 * Tout est pur (aucun accès base, aucun état) : la page charge toutes les
 * réponses, lit les paramètres d'URL et délègue ici le filtrage, les
 * compteurs des puces et la construction des liens.
 *
 * Paramètres d'URL : `reponse`, `negociateur`, `segment`. Une valeur inconnue
 * est ignorée (elle équivaut à « toutes »).
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

/** Valeur de `negociateur` qui désigne les réponses sans négociateur renseigné. */
export const NO_NEGOTIATOR_VALUE = "aucun";
export const NO_NEGOTIATOR_LABEL = "Sans négociateur";
const ALL_NEGOTIATORS_VALUE = "tous";

/** Sans filtre, le tableau s'arrête aux 50 réponses les plus récentes. */
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

/** Valeurs brutes lues dans l'URL (chaîne, tableau si le paramètre est répété, ou absent). */
export type ResponseFilterInput = {
  response?: unknown;
  negotiator?: unknown;
  segment?: unknown;
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

type FilterValues = Pick<ResponseFilters, "response" | "negotiator" | "segment">;

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
 * que la rangée de puces reste stable d'un filtre à l'autre.
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

/** Lien vers la même page, avec un filtre modifié et les autres conservés. */
export const buildFilterHref = (
  filters: FilterValues,
  patch: Partial<FilterValues> = {},
  basePath: string = REACTIVATION_ADMIN_PATH
): string => {
  const next: FilterValues = {
    response: filters.response,
    negotiator: filters.negotiator,
    segment: filters.segment,
    ...patch,
  };
  const query = new URLSearchParams();
  if (next.response) query.set(RESPONSE_PARAM, next.response);
  if (next.negotiator) query.set(NEGOTIATOR_PARAM, next.negotiator);
  if (next.segment) query.set(SEGMENT_PARAM, next.segment);
  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
};

export type FilterChip = {
  key: string;
  label: string;
  count: number;
  active: boolean;
  href: string;
};

export type ResponsesView = {
  filters: ResponseFilters;
  /** Vrai dès qu'un filtre reconnu est appliqué. */
  active: boolean;
  /** Lignes à afficher : toutes les correspondances avec filtre, les 50 plus récentes sans. */
  rows: ReactivationResponseRow[];
  /** Nombre de réponses qui correspondent aux filtres. */
  matching: number;
  /** Nombre total de réponses reçues. */
  total: number;
  /** Vrai quand l'affichage est tronqué aux 50 plus récentes. */
  limited: boolean;
  /** « 50 dernières sur N » sans filtre, « N réponse(s) » sinon. */
  summary: string;
  responseChips: FilterChip[];
  negotiatorChips: FilterChip[];
  resetHref: string;
};

const countLabel = (count: number) => `${count} réponse${count > 1 ? "s" : ""}`;

/** Tout ce dont la page a besoin pour afficher le tableau filtré et ses puces. */
export const buildResponsesView = (
  rows: readonly ReactivationResponseRow[],
  input: ResponseFilterInput,
  basePath: string = REACTIVATION_ADMIN_PATH
): ResponsesView => {
  const filters = resolveResponseFilters(rows, input);
  const active = hasActiveFilter(filters);
  const matchingRows = applyResponseFilters(rows, filters);
  const limited = !active && matchingRows.length > UNFILTERED_LIMIT;

  const byResponse = countByResponse(rows, filters);
  const present = new Set(rows.map((row) => row.response));
  const responseChips: FilterChip[] = [
    {
      key: "toutes",
      label: "Toutes",
      count: byResponse.total,
      active: filters.response === null,
      href: buildFilterHref(filters, { response: null }, basePath),
    },
    ...RESPONSE_CHIP_ORDER.filter((response) => present.has(response)).map((response) => ({
      key: response,
      label: OWNER_RESPONSE_LABELS[response],
      count: byResponse.counts[response] ?? 0,
      active: filters.response === response,
      href: buildFilterHref(filters, { response }, basePath),
    })),
  ];

  const byNegotiator = countByNegotiator(rows, filters);
  const negotiatorChips: FilterChip[] = [
    {
      key: "tous",
      label: "Tous",
      count: byNegotiator.total,
      active: filters.negotiator === null,
      href: buildFilterHref(filters, { negotiator: null }, basePath),
    },
    ...byNegotiator.groups.map((group) => ({
      key: group.key === "" ? NO_NEGOTIATOR_VALUE : group.key,
      label: group.label,
      count: group.count,
      active: filters.negotiatorKeys.has(group.key),
      href: buildFilterHref(filters, { negotiator: group.key === "" ? NO_NEGOTIATOR_VALUE : group.key }, basePath),
    })),
  ];

  return {
    filters,
    active,
    rows: limited ? matchingRows.slice(0, UNFILTERED_LIMIT) : matchingRows,
    matching: matchingRows.length,
    total: rows.length,
    limited,
    summary: limited ? `${UNFILTERED_LIMIT} dernières sur ${rows.length}` : countLabel(matchingRows.length),
    responseChips,
    negotiatorChips,
    resetHref: basePath,
  };
};
