import "server-only";

import { getOperationRaw, getRecordRaw } from "@/lib/mynotary/client";

// RGPD-sensitive: the structured facts below (seller name/email/phone,
// exact price, Loi Carrez surface) come from MyNotary contracts and must
// stay server-side / `service_role`. Never expose through public selectors.

export type MyNotaryParty = {
  role: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isCompany: boolean;
};

export type OperationEnrichment = {
  /** Parties on the seller side (VENDEUR / MANDANT / BAILLEUR…). */
  sellerContacts: MyNotaryParty[];
  /** Parties on the buyer side (OFFRANT / ACQUEREUR / LOCATAIRE…). */
  buyerContacts: MyNotaryParty[];
  /** Normalized address parsed from the BIEN_VENDU record (if any). */
  propertyAddress: string | null;
  /** Loi Carrez / living area in m² parsed from the property record. */
  livingArea: number | null;
  /** Contract price (offre_prix for offers, prix_vente_total for mandates…). */
  price: number | null;
};

const SELLER_ROLES = new Set([
  "VENDEUR",
  "MANDANT",
  "BAILLEUR",
  "PROPRIETAIRE",
  "CEDANT",
]);

const BUYER_ROLES = new Set([
  "OFFRANT",
  "ACQUEREUR",
  "ACQUEREUR_POTENTIEL",
  "LOCATAIRE",
  "PRENEUR",
  "CESSIONNAIRE",
]);

const PROPERTY_ROLES = new Set([
  "BIEN_VENDU",
  "BIEN",
  "BIEN_LOUE",
  "BIEN_OBJET",
]);

// Operation-level question keys that carry the headline price, in
// priority order (first numeric wins).
const PRICE_KEYS = [
  "offre_prix",
  "prix_vente_total",
  "prix_net_vendeur",
  "prix_vente",
  "prix",
  "montant",
];

const SURFACE_KEYS = [
  "mesurage_carrez_superficie",
  "superficie_carrez",
  "surface_habitable",
  "surface",
  "living_area",
];

const asString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asQuestions = (record: Record<string, unknown>): Record<string, unknown> => {
  const questions = record.questions;
  return questions && typeof questions === "object"
    ? (questions as Record<string, unknown>)
    : {};
};

const formatAddressObject = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return asString(value);
  const obj = value as Record<string, unknown>;
  const rue = asString(obj.rue) ?? asString(obj.adresse);
  const ville = asString(obj.ville);
  const codePostal = asString(obj.codePostal) ?? asString(obj.code_postal);
  const cityPart = [codePostal, ville].filter(Boolean).join(" ");
  const parts = [rue, cityPart].filter((part) => part && part.length > 0);
  const joined = parts.join(", ").trim();
  return joined.length > 0 ? joined : null;
};

const parsePerson = (
  role: string,
  record: Record<string, unknown>
): MyNotaryParty => {
  const questions = asQuestions(record);
  const type = asString(record.type) ?? "";
  const isCompany = type.includes("MORALE");
  const lastName = asString(questions.nom) ?? asString(questions.denomination);
  const firstName = asString(questions.prenoms) ?? asString(questions.prenom);
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || lastName || null;
  return {
    role,
    fullName,
    firstName,
    lastName,
    email: asString(questions.email),
    phone: asString(questions.telephone) ?? asString(questions.tel),
    address: formatAddressObject(questions.adresse),
    isCompany,
  };
};

const pickNumberFromQuestions = (
  questions: Record<string, unknown>,
  keys: string[]
): number | null => {
  for (const key of keys) {
    const value = asNumber(questions[key]);
    if (value !== null && value > 0) return value;
  }
  return null;
};

const toRecordIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((entry) => {
      if (typeof entry === "number") return entry;
      if (typeof entry === "string" && /^\d+$/.test(entry)) return Number(entry);
      if (entry && typeof entry === "object") {
        const id = (entry as Record<string, unknown>).id;
        if (typeof id === "number") return id;
        if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
      }
      return null;
    })
    .filter((id): id is number => id !== null);
  return Array.from(new Set(ids));
};

/**
 * Fetch a MyNotary operation and resolve its structured facts:
 * seller / buyer parties (name, email, phone, address), the property
 * address + Loi Carrez surface, and the headline price.
 *
 * Best-effort and resilient: any failure to fetch a sub-record is logged
 * and skipped rather than failing the whole enrichment.
 */
export const enrichFromOperation = async (
  operationId: string
): Promise<OperationEnrichment> => {
  const empty: OperationEnrichment = {
    sellerContacts: [],
    buyerContacts: [],
    propertyAddress: null,
    livingArea: null,
    price: null,
  };

  let operation: Record<string, unknown>;
  try {
    operation = await getOperationRaw(operationId);
  } catch (error) {
    console.warn(
      `[mynotary-enrich] failed to fetch operation ${operationId}`,
      error instanceof Error ? error.message : error
    );
    return empty;
  }

  const recordsMap =
    operation.records && typeof operation.records === "object"
      ? (operation.records as Record<string, unknown>)
      : {};
  const operationQuestions = asQuestions(operation);

  const price = pickNumberFromQuestions(operationQuestions, PRICE_KEYS);

  const sellerContacts: MyNotaryParty[] = [];
  const buyerContacts: MyNotaryParty[] = [];
  let propertyAddress: string | null = null;
  let livingArea: number | null = null;

  // Cache record fetches to avoid re-fetching duplicated ids.
  const recordCache = new Map<number, Record<string, unknown> | null>();
  const loadRecord = async (id: number) => {
    if (recordCache.has(id)) return recordCache.get(id) ?? null;
    try {
      const record = await getRecordRaw(String(id));
      recordCache.set(id, record);
      return record;
    } catch (error) {
      console.warn(
        `[mynotary-enrich] failed to fetch record ${id}`,
        error instanceof Error ? error.message : error
      );
      recordCache.set(id, null);
      return null;
    }
  };

  for (const [role, rawIds] of Object.entries(recordsMap)) {
    const ids = toRecordIds(rawIds);
    if (ids.length === 0) continue;

    const upperRole = role.toUpperCase();
    const isSeller = SELLER_ROLES.has(upperRole);
    const isBuyer = BUYER_ROLES.has(upperRole);
    const isProperty = PROPERTY_ROLES.has(upperRole);
    if (!isSeller && !isBuyer && !isProperty) continue;

    for (const id of ids) {
      const record = await loadRecord(id);
      if (!record) continue;

      if (isProperty) {
        const questions = asQuestions(record);
        if (!propertyAddress) {
          propertyAddress = formatAddressObject(questions.adresse);
        }
        if (livingArea === null) {
          livingArea = pickNumberFromQuestions(questions, SURFACE_KEYS);
        }
        continue;
      }

      const party = parsePerson(upperRole, record);
      // Skip empty parties (no name/email/phone at all).
      if (!party.fullName && !party.email && !party.phone) continue;
      if (isSeller) sellerContacts.push(party);
      else buyerContacts.push(party);
    }
  }

  return {
    sellerContacts,
    buyerContacts,
    propertyAddress,
    livingArea,
    price,
  };
};
