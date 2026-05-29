import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────────────
// Golden record (Phase 3).
//
// Aggregates every source attached to a `client_project` hub
// (estimator lead + estimator property, SweepBright property + vendors,
// matched MyNotary document) and resolves each field with a
// source-priority matrix, then applies manual overrides stored in
// `seller_projects.metadata.golden_overrides`.
//
// We never physically merge rows: each field carries its retained
// value + source + the diverging alternatives so the UI can show a
// divergence badge and let the operator pick / override.
//
// Default priority matrix (cf. plan):
//   - seller identity : mynotary > sweepbright > estimator
//   - living area     : sweepbright > mynotary > estimator
//   - price           : sweepbright > mynotary > estimator
//   - address         : sweepbright > mynotary > estimator
//   - type/rooms/floor: sweepbright > estimator
//   - manual override : absolute priority on any field.
// ─────────────────────────────────────────────────────────────────────

export type GoldenSource = "manual" | "sweepbright" | "mynotary" | "estimator";

export type GoldenField<T> = {
  value: T | null;
  source: GoldenSource | null;
  alternatives: Array<{ value: T; source: GoldenSource }>;
  hasDivergence: boolean;
};

export type PropertyGoldenRecord = {
  clientProjectId: string;
  sellerProjectId: string | null;
  address: GoldenField<string>;
  price: GoldenField<number>;
  livingArea: GoldenField<number>;
  propertyType: GoldenField<string>;
  rooms: GoldenField<number>;
  floor: GoldenField<number>;
  seller: {
    fullName: GoldenField<string>;
    email: GoldenField<string>;
    phone: GoldenField<string>;
  };
  sources: { sweepbright: boolean; mynotary: boolean; estimator: boolean };
};

// Overridable field paths exposed to the UI.
export type GoldenOverrideField =
  | "address"
  | "price"
  | "livingArea"
  | "propertyType"
  | "rooms"
  | "floor"
  | "seller.fullName"
  | "seller.email"
  | "seller.phone";

type Candidate<T> = { value: T | null | undefined; source: GoldenSource };

const isPresent = <T,>(value: T | null | undefined): value is T => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
};

// Resolve one field from an ordered list of candidates + the optional
// manual override. The first present candidate (after the override)
// becomes the retained value; the remaining distinct present values
// become alternatives (for the divergence badge).
const resolveField = <T,>(
  candidates: Candidate<T>[],
  override?: { value: T; source: "manual" } | null
): GoldenField<T> => {
  const ordered: Candidate<T>[] = override
    ? [{ value: override.value, source: "manual" }, ...candidates]
    : candidates;

  const present = ordered.filter((c) => isPresent(c.value)) as Array<{
    value: T;
    source: GoldenSource;
  }>;

  if (present.length === 0) {
    return { value: null, source: null, alternatives: [], hasDivergence: false };
  }

  const [primary, ...rest] = present;
  // Alternatives = distinct values different from the retained one.
  const seen = new Set<string>([JSON.stringify(primary.value)]);
  const alternatives: Array<{ value: T; source: GoldenSource }> = [];
  for (const candidate of rest) {
    const key = JSON.stringify(candidate.value);
    if (seen.has(key)) continue;
    seen.add(key);
    alternatives.push(candidate);
  }

  return {
    value: primary.value,
    source: primary.source,
    alternatives,
    hasDivergence: alternatives.length > 0,
  };
};

type SourceBundle = {
  sweepbright: {
    address: string | null;
    price: number | null;
    livingArea: number | null;
    propertyType: string | null;
    rooms: number | null;
    floor: number | null;
    seller: { fullName: string | null; email: string | null; phone: string | null };
  } | null;
  estimator: {
    address: string | null;
    price: number | null;
    propertyType: string | null;
    seller: { fullName: string | null; email: string | null; phone: string | null };
  } | null;
  mynotary: {
    address: string | null;
    price: number | null;
    livingArea: number | null;
    seller: { fullName: string | null; email: string | null; phone: string | null };
  } | null;
};

const firstVendor = (rawPayload: unknown): { fullName: string | null; email: string | null; phone: string | null } => {
  const empty = { fullName: null, email: null, phone: null };
  if (!rawPayload || typeof rawPayload !== "object") return empty;
  const vendors = (rawPayload as Record<string, unknown>).vendors;
  const list = Array.isArray(vendors) ? vendors : vendors ? [vendors] : [];
  const v = list[0];
  if (!v || typeof v !== "object") return empty;
  const rec = v as Record<string, unknown>;
  const firstName =
    (typeof rec.first_name === "string" && rec.first_name) ||
    (typeof rec.firstname === "string" && rec.firstname) ||
    "";
  const lastName =
    (typeof rec.last_name === "string" && rec.last_name) ||
    (typeof rec.lastname === "string" && rec.lastname) ||
    "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    (typeof rec.name === "string" ? rec.name.trim() : "") ||
    null;
  const email =
    typeof rec.email === "string"
      ? rec.email
      : Array.isArray(rec.emails) && typeof (rec.emails[0] as Record<string, unknown>)?.address === "string"
        ? ((rec.emails[0] as Record<string, unknown>).address as string)
        : null;
  const phone =
    typeof rec.phone === "string"
      ? rec.phone
      : Array.isArray(rec.phones) && typeof (rec.phones[0] as Record<string, unknown>)?.number === "string"
        ? ((rec.phones[0] as Record<string, unknown>).number as string)
        : null;
  return { fullName, email, phone };
};

const loadSourceBundle = async (
  clientProjectId: string,
  sellerProjectId: string | null,
  sellerLeadId: string | null
): Promise<SourceBundle> => {
  const bundle: SourceBundle = { sweepbright: null, estimator: null, mynotary: null };

  // Linked properties (SweepBright + estimator lines).
  const { data: links } = await supabaseAdmin
    .from("project_properties")
    .select("property_id")
    .eq("client_project_id", clientProjectId)
    .is("unlinked_at", null);
  const propertyIds = (links ?? []).map((l) => l.property_id as string);

  if (propertyIds.length > 0) {
    const { data: props } = await supabaseAdmin
      .from("properties")
      .select(
        "id, source, formatted_address, living_area, property_type, rooms, floor, raw_payload"
      )
      .in("id", propertyIds);
    const { data: listings } = await supabaseAdmin
      .from("property_listings")
      .select("property_id, price_amount")
      .in("property_id", propertyIds);
    const priceByProperty = new Map<string, number | null>();
    for (const l of (listings ?? []) as Array<{ property_id: string; price_amount: number | null }>) {
      priceByProperty.set(l.property_id, l.price_amount);
    }

    for (const p of (props ?? []) as Array<{
      id: string;
      source: string | null;
      formatted_address: string | null;
      living_area: number | null;
      property_type: string | null;
      rooms: number | null;
      floor: number | null;
      raw_payload: unknown;
    }>) {
      if (p.source === "sweepbright" && !bundle.sweepbright) {
        bundle.sweepbright = {
          address: p.formatted_address,
          price: priceByProperty.get(p.id) ?? null,
          livingArea: p.living_area,
          propertyType: p.property_type,
          rooms: p.rooms,
          floor: p.floor,
          seller: firstVendor(p.raw_payload),
        };
      } else if (p.source === "seller_estimation" && !bundle.estimator) {
        bundle.estimator = {
          address: p.formatted_address,
          price: priceByProperty.get(p.id) ?? null,
          propertyType: p.property_type,
          seller: { fullName: null, email: null, phone: null },
        };
      }
    }
  }

  // Estimator lead (identity + estimated price + address fallback).
  if (sellerLeadId) {
    const { data: lead } = await supabaseAdmin
      .from("seller_leads")
      .select("full_name, email, phone, property_address, estimated_price, property_type")
      .eq("id", sellerLeadId)
      .maybeSingle();
    if (lead) {
      const row = lead as {
        full_name: string | null;
        email: string | null;
        phone: string | null;
        property_address: string | null;
        estimated_price: number | null;
        property_type: string | null;
      };
      bundle.estimator = {
        address: bundle.estimator?.address ?? row.property_address,
        price: bundle.estimator?.price ?? row.estimated_price,
        propertyType: bundle.estimator?.propertyType ?? row.property_type,
        seller: {
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
        },
      };
    }
  }

  // Matched MyNotary document (most recent).
  if (sellerProjectId) {
    const reader = supabaseAdmin as unknown as {
      from: (table: "mynotary_signed_documents") => {
        select: (cols: string) => {
          eq: (
            col: string,
            value: string
          ) => {
            is: (
              col: string,
              value: unknown
            ) => {
              order: (
                col: string,
                opts: { ascending: boolean }
              ) => {
                limit: (n: number) => Promise<{
                  data: Array<{
                    seller_contacts: Array<{
                      fullName: string | null;
                      email: string | null;
                      phone: string | null;
                    }> | null;
                    property_price: number | null;
                    living_area: number | null;
                    raw_payload: { parsed?: { inline_address?: string | null } } | null;
                  }> | null;
                }>;
              };
            };
          };
        };
      };
    };
    const { data: docs } = await reader
      .from("mynotary_signed_documents")
      .select("seller_contacts, property_price, living_area, raw_payload")
      .eq("matched_seller_project_id", sellerProjectId)
      .is("deleted_at", null)
      .order("signed_at", { ascending: false })
      .limit(1);
    const doc = docs && docs.length > 0 ? docs[0] : null;
    if (doc) {
      const contact = (doc.seller_contacts ?? [])[0] ?? null;
      bundle.mynotary = {
        address: doc.raw_payload?.parsed?.inline_address ?? null,
        price: doc.property_price ?? null,
        livingArea: doc.living_area ?? null,
        seller: {
          fullName: contact?.fullName ?? null,
          email: contact?.email ?? null,
          phone: contact?.phone ?? null,
        },
      };
    }
  }

  return bundle;
};

type GoldenOverrides = Partial<
  Record<GoldenOverrideField, { value: unknown; source: "manual"; set_by?: string | null; set_at?: string }>
>;

const readOverrides = (metadata: unknown): GoldenOverrides => {
  if (!metadata || typeof metadata !== "object") return {};
  const go = (metadata as Record<string, unknown>).golden_overrides;
  return go && typeof go === "object" ? (go as GoldenOverrides) : {};
};

const overrideFor = <T,>(
  overrides: GoldenOverrides,
  field: GoldenOverrideField
): { value: T; source: "manual" } | null => {
  const entry = overrides[field];
  if (!entry || !isPresent(entry.value)) return null;
  return { value: entry.value as T, source: "manual" };
};

export const computePropertyGoldenRecord = async (
  clientProjectId: string
): Promise<PropertyGoldenRecord | null> => {
  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("id, seller_lead_id, metadata")
    .eq("client_project_id", clientProjectId)
    .maybeSingle();
  const sellerProject = sp as
    | { id: string; seller_lead_id: string | null; metadata: unknown }
    | null;

  const sellerProjectId = sellerProject?.id ?? null;
  const sellerLeadId = sellerProject?.seller_lead_id ?? null;
  const overrides = readOverrides(sellerProject?.metadata);

  const bundle = await loadSourceBundle(clientProjectId, sellerProjectId, sellerLeadId);

  const sb = bundle.sweepbright;
  const est = bundle.estimator;
  const mn = bundle.mynotary;

  return {
    clientProjectId,
    sellerProjectId,
    address: resolveField<string>(
      [
        { value: sb?.address, source: "sweepbright" },
        { value: mn?.address, source: "mynotary" },
        { value: est?.address, source: "estimator" },
      ],
      overrideFor<string>(overrides, "address")
    ),
    price: resolveField<number>(
      [
        { value: sb?.price, source: "sweepbright" },
        { value: mn?.price, source: "mynotary" },
        { value: est?.price, source: "estimator" },
      ],
      overrideFor<number>(overrides, "price")
    ),
    livingArea: resolveField<number>(
      [
        { value: sb?.livingArea, source: "sweepbright" },
        { value: mn?.livingArea, source: "mynotary" },
      ],
      overrideFor<number>(overrides, "livingArea")
    ),
    propertyType: resolveField<string>(
      [
        { value: sb?.propertyType, source: "sweepbright" },
        { value: est?.propertyType, source: "estimator" },
      ],
      overrideFor<string>(overrides, "propertyType")
    ),
    rooms: resolveField<number>(
      [{ value: sb?.rooms, source: "sweepbright" }],
      overrideFor<number>(overrides, "rooms")
    ),
    floor: resolveField<number>(
      [{ value: sb?.floor, source: "sweepbright" }],
      overrideFor<number>(overrides, "floor")
    ),
    seller: {
      fullName: resolveField<string>(
        [
          { value: mn?.seller.fullName, source: "mynotary" },
          { value: sb?.seller.fullName, source: "sweepbright" },
          { value: est?.seller.fullName, source: "estimator" },
        ],
        overrideFor<string>(overrides, "seller.fullName")
      ),
      email: resolveField<string>(
        [
          { value: mn?.seller.email, source: "mynotary" },
          { value: sb?.seller.email, source: "sweepbright" },
          { value: est?.seller.email, source: "estimator" },
        ],
        overrideFor<string>(overrides, "seller.email")
      ),
      phone: resolveField<string>(
        [
          { value: mn?.seller.phone, source: "mynotary" },
          { value: sb?.seller.phone, source: "sweepbright" },
          { value: est?.seller.phone, source: "estimator" },
        ],
        overrideFor<string>(overrides, "seller.phone")
      ),
    },
    sources: {
      sweepbright: sb !== null,
      mynotary: mn !== null,
      estimator: est !== null,
    },
  };
};

const OVERRIDE_FIELDS: GoldenOverrideField[] = [
  "address",
  "price",
  "livingArea",
  "propertyType",
  "rooms",
  "floor",
  "seller.fullName",
  "seller.email",
  "seller.phone",
];

// Persist (or clear) a manual override on `seller_projects.metadata`.
// Passing `value === null` clears the override so the golden record
// falls back to the source-priority matrix.
export const setGoldenOverride = async (input: {
  sellerProjectId: string;
  field: GoldenOverrideField;
  value: unknown | null;
  adminProfileId?: string | null;
}): Promise<void> => {
  if (!OVERRIDE_FIELDS.includes(input.field)) {
    throw new Error(`Champ d'override invalide: ${input.field}`);
  }
  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("metadata")
    .eq("id", input.sellerProjectId)
    .maybeSingle();
  if (!sp) throw new Error("Projet vendeur introuvable.");

  const metadata =
    (sp as { metadata: unknown }).metadata &&
    typeof (sp as { metadata: unknown }).metadata === "object"
      ? ({ ...(sp as { metadata: Record<string, unknown> }).metadata } as Record<string, unknown>)
      : {};
  const overrides: GoldenOverrides = readOverrides(metadata);

  if (input.value === null || input.value === undefined || input.value === "") {
    delete overrides[input.field];
  } else {
    overrides[input.field] = {
      value: input.value,
      source: "manual",
      set_by: input.adminProfileId ?? null,
      set_at: new Date().toISOString(),
    };
  }
  metadata.golden_overrides = overrides;

  const writer = supabaseAdmin as unknown as {
    from: (table: "seller_projects") => {
      update: (row: Record<string, unknown>) => {
        eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };
  const { error } = await writer
    .from("seller_projects")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", input.sellerProjectId);
  if (error) throw new Error(error.message);
};
