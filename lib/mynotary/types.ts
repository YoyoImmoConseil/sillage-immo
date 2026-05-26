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

export type MyNotaryContractKind = "mandate" | "purchase_offer" | "preliminary_sale";

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

export type MyNotaryWebhookEnvelope<TPayload = Record<string, unknown>> = {
  event: MyNotaryEventType;
  eventId?: string;
  timestamp?: string;
  organizationId?: number | string;
  data: TPayload;
};

export type MyNotaryFile = {
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

export type MyNotarySignatureCompletedPayload = {
  signatureId: number | string;
  signatureTime?: string;
  signedAt?: string;
  contractId: number | string;
  contractType: string;
  operationId: number | string;
  operationType?: string;
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

export type MyNotaryRegisterEntry = {
  id: number | string;
  contractId?: number | string;
  contractType?: string;
  operationId: number | string;
  status?: string;
  signedAt?: string;
  signatureTime?: string;
  files?: MyNotaryFile[];
  signers?: MyNotarySigner[];
  raw?: Record<string, unknown>;
};

export type MyNotaryRegisterEntriesPage = {
  entries: MyNotaryRegisterEntry[];
  nextCursor?: string | null;
};

// Mapping table from MyNotary's free-form `contractType` string to
// our 3 canonical buckets. Anything that does not match returns null
// → the signature is logged in `mynotary_events` but NOT promoted to
// `mynotary_signed_documents` (keeps the dashboard noise-free).
//
// Built from the MyNotary contract catalog. New aliases can be added
// without ever shipping a migration.
const CONTRACT_KIND_ALIASES: Record<MyNotaryContractKind, string[]> = {
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
