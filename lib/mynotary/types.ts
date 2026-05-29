// Types for the MyNotary Public API (https://dev.mynotary.fr/external).
//
// We only model the surface we actually consume in phase 1 (inbound):
//   - the webhook payload for `signature_completed`,
//     `signature_cancel`, `operation_deleted`
//   - the response of `GET /register-entries` (paginated)
//   - the response of `GET /operations/{id}` and `GET /records/{id}`
//     that we hit to fetch the contacts + property attached to a
//     signed contract, for best-effort auto-matching.
//
// The MyNotary OpenAPI doc is large; the shapes below are the minimal
// subset our code reads. The full payload still lands in
// `mynotary_events.raw_payload` / `mynotary_signed_documents.raw_payload`,
// so we can extract more fields later without re-shipping a migration.

// Canonical contract buckets. The first three are the "sale side"
// surfaced in the /admin dashboard KPI cards; the rest are stored for
// the MCP / AI layer and traceability but excluded from the headline
// KPIs (decision: 29/05/2026 — KPI = vente uniquement).
export type MyNotaryContractKind =
  | "mandate"
  | "purchase_offer"
  | "preliminary_sale"
  | "rental_mandate"
  | "lease"
  | "guarantee"
  | "management_mandate"
  | "other";

// The three kinds that feed the dashboard KPI cards.
export const SALE_CONTRACT_KINDS: ReadonlySet<MyNotaryContractKind> = new Set([
  "mandate",
  "purchase_offer",
  "preliminary_sale",
]);

export const isSaleContractKind = (
  kind: MyNotaryContractKind | null | undefined
): boolean => kind != null && SALE_CONTRACT_KINDS.has(kind);

export type MyNotaryEventType =
  | "signature_completed"
  | "signature_cancel"
  | "signature_created"
  | "operation_created"
  | "operation_deleted"
  | "contract_created"
  | "contract_deleted"
  | "register_letter_created"
  | "register_letter_cancel"
  | "register_letter_completed"
  | "legal_record_deleted";

// Per the MyNotary spec, webhook events are POSTed with the payload
// directly at the root of the body (no `data` wrapper). Each event
// kind has its own envelope; we keep `MyNotaryWebhookEnvelope` as a
// generic loose-typed wrapper because we still log `raw_payload` for
// audit and only parse the fields we actually consume.
export type MyNotaryWebhookEnvelope<TPayload = Record<string, unknown>> = {
  // Backwards-compat with the previous (non-spec) envelope shape we
  // assumed before reading the OpenAPI spec. The webhook handler
  // tolerates both `event` and `eventId` at the root.
  event?: MyNotaryEventType;
  eventId?: string | MyNotaryEventType;
  timestamp?: string;
  organizationId?: number | string;
  data?: TPayload;
} & Partial<TPayload>;

export type MyNotaryFile = {
  // From WebhookSignatureCompletedFile (spec): { name, url } both
  // required. We treat `url` as a short-lived signed link and download
  // immediately on receipt (see archive-signed-document.service.ts).
  name: string;
  url: string;
  contentType?: string;
};

export type MyNotarySigner = {
  recordId?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
};

// Per `WebhookSignatureCompletedEvent` in the spec. `signatureTime`
// is an int64 Unix-ms timestamp at the root of the payload; older
// envelopes also carry ISO strings, so we tolerate both formats.
export type MyNotarySignatureCompletedPayload = {
  signatureId: number | string;
  // Unix ms (preferred per spec) or ISO 8601.
  signatureTime?: number | string;
  signedAt?: string;
  contractId: number | string;
  // The spec does not include `contractType` in the webhook payload;
  // it must be fetched via GET /contracts/{contractId}. We keep this
  // field optional so the backfill (which does carry it) and any
  // future webhook enrichment can populate it directly.
  contractType?: string;
  operationId: number | string;
  operationType?: string;
  userId?: number | string;
  organizationId?: number | string;
  files?: MyNotaryFile[];
  signers?: MyNotarySigner[];
};

export type MyNotaryRecordSummary = {
  recordId: number | string;
  recordType: string;
  fields?: Record<string, unknown>;
};

export type MyNotaryOperationSummary = {
  operationId: number | string;
  operationType: string;
  records?: MyNotaryRecordSummary[];
  createdAt?: string;
};

// Shape returned by `GET /operations` (list) and embedded in each
// operation's `contracts[]`. Confirmed empirically against
// api.mynotary.fr (29/05/2026). `status` drives ingestion:
// "SIGNATURE_COMPLETED" = fully signed. `model` is the machine
// template id we classify into a MyNotaryContractKind.
export type MyNotaryContractStatus =
  | "REDACTION"
  | "VALIDATED"
  | "SIGNATURE_PENDING"
  | "NOTIFICATION_PENDING"
  | "SIGNATURE_COMPLETED"
  | string;

export type MyNotaryContractSummary = {
  id: number | string;
  model: string;
  label?: string;
  status: MyNotaryContractStatus;
  creationTime?: string;
  signatureTime?: string;
  signatureType?: string;
};

// One element of the `GET /operations` array. We only model the
// fields the backfill reads; the verbatim object is still persisted
// in `raw_payload` for downstream re-enrichment.
export type MyNotaryOperationListItem = {
  id: number | string;
  label?: string;
  type?: string;
  organizationId?: number | string;
  creationTime?: string;
  archived?: boolean;
  contracts?: MyNotaryContractSummary[];
};

// A signed contract is one whose status is SIGNATURE_COMPLETED.
export const isContractSigned = (
  status: MyNotaryContractStatus | undefined | null
): boolean => status === "SIGNATURE_COMPLETED";

// Two distinct registers per the spec: `MANAGEMENT` (mandats) and
// `TRANSACTION` (promesses / compromis / actes). The backfill loops
// over both.
export type MyNotaryRegisterType = "MANAGEMENT" | "TRANSACTION";

// Per `RegisterEntry` in the spec. Only the fields we actually map
// are typed; everything else is forwarded via `raw_payload`.
export type MyNotaryRegisterEntry = {
  id: string | number;
  entryNumber?: number;
  type?: MyNotaryRegisterType;
  status?: "CLOSED" | "RESERVED" | "VALIDATED" | string;
  organizationId?: string | number;
  legalOperationId?: string | number;
  // Sillage convention: `contractId` + `operationId` are the foreign
  // keys we persist. The spec exposes them via `legalOperationId` /
  // `numeroRepertoire`; the field aliases here let the engine adapt
  // without breaking the existing service contract.
  contractId?: number | string;
  contractType?: string;
  operationId?: number | string;
  biens?: string;
  mandants?: string;
  typeDeMandat?: string;
  dateFinMandat?: string;
  numeroRepertoire?: string;
  observations?: string;
  creationTime?: string;
  // Sillage extensions kept for downstream code:
  signedAt?: string;
  signatureTime?: string;
  files?: MyNotaryFile[];
  signers?: MyNotarySigner[];
  raw?: Record<string, unknown>;
};

// MyNotary's `RegisterEntryList { items: RegisterEntry[] }` uses
// 0-indexed page numbers (no cursor). We expose `page`, `hasMore`,
// and the raw `total` so the backfill loop can stop early.
export type MyNotaryRegisterEntriesPage = {
  entries: MyNotaryRegisterEntry[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  // Total count of entries in the register (across all pages), when
  // the API reports it. Undefined when MyNotary omits the field.
  total?: number;
};

// Returned by POST /clients (cf. OrganizationDto in the spec).
export type MyNotaryOrganizationDto = {
  id: string;
  name?: string;
  address?: string;
};

// Mapping table from MyNotary's free-form `contractType` string to
// our 3 canonical buckets. Anything that does not match returns null
// → the signature is logged in `mynotary_events` but NOT promoted to
// `mynotary_signed_documents` (keeps the dashboard noise-free).
//
// Built from the MyNotary contract catalog. New aliases can be added
// without ever shipping a migration.
// Only the sale kinds have free-form French aliases (used by
// resolveContractKind as a fallback). Non-sale kinds are resolved
// structurally from the machine `model` in classifyContractModel.
const CONTRACT_KIND_ALIASES: Partial<Record<MyNotaryContractKind, string[]>> = {
  mandate: [
    "mandat",
    "mandat de vente",
    "mandat vente",
    "mandat exclusif",
    "mandat de vente exclusif",
    "mandat de vente simple",
    "mandat de recherche",
    "mandat de gestion",
    "mandat de location",
    "sale_mandate",
    "rental_mandate",
    "search_mandate",
    "management_mandate",
  ],
  purchase_offer: [
    "offre",
    "offre d'achat",
    "offre achat",
    "promesse d'achat",
    "purchase_offer",
    "offer",
    "buy_offer",
  ],
  preliminary_sale: [
    "compromis",
    "compromis de vente",
    "promesse de vente",
    "promesse synallagmatique",
    "preliminary_sale",
    "sale_agreement",
    "pre_contract",
  ],
};

const normalizeContractTypeKey = (raw: string): string => {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

export const resolveContractKind = (
  raw: string | null | undefined
): MyNotaryContractKind | null => {
  if (!raw) return null;
  const key = normalizeContractTypeKey(raw);
  for (const [kind, aliases] of Object.entries(CONTRACT_KIND_ALIASES) as Array<
    [MyNotaryContractKind, string[]]
  >) {
    for (const alias of aliases) {
      const normAlias = normalizeContractTypeKey(alias);
      if (key === normAlias || key.includes(normAlias)) {
        return kind;
      }
    }
  }
  return null;
};

// Classify a MyNotary contract `model` (the machine template id, e.g.
// "IMMOBILIER_VENTE_ANCIEN_OFFRE_ACHAT") into one of our canonical
// buckets. Unlike `resolveContractKind` (which works on free-form
// French labels), this MUST distinguish the sale side (VENTE) from the
// rental side (LOCATION) — otherwise the 39 signed rental mandates
// would land in the "mandate" KPI alongside the sale mandates.
//
// Decision rules (most specific first), case-insensitive on the
// uppercased model token. Always returns a concrete kind ("other" as
// the catch-all) so every SIGNATURE_COMPLETED contract is ingested.
export const classifyContractModel = (
  model: string | null | undefined,
  fallbackLabel?: string | null
): MyNotaryContractKind => {
  const m = (model ?? "").toUpperCase();

  if (m.length > 0) {
    const isRental = m.includes("LOCATION") || m.includes("BAIL");
    if (isRental) {
      if (m.includes("BAIL")) return "lease";
      if (m.includes("CAUTIONNEMENT")) return "guarantee";
      if (m.includes("MANDAT") || m.includes("GESTION")) return "rental_mandate";
      return "other";
    }
    // Sale side (VENTE / TRANSACTION) and everything else.
    if (m.includes("CAUTIONNEMENT")) return "guarantee";
    if (m.includes("GESTION")) return "management_mandate";
    if (m.includes("OFFRE_ACHAT") || m.includes("OFFRE")) return "purchase_offer";
    if (m.includes("COMPROMIS") || m.includes("PROMESSE")) {
      return "preliminary_sale";
    }
    if (m.includes("MANDAT")) return "mandate";
    if (m.includes("BON_VISITE")) return "other";
    // Fall through to the free-form resolver before giving up.
  }

  // No (or unrecognized) model: best-effort on the human label, else
  // "other" so the contract is still stored.
  const fromLabel = resolveContractKind(fallbackLabel ?? model ?? null);
  return fromLabel ?? "other";
};
