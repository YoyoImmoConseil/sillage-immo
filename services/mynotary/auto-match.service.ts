import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperation, getRecord } from "@/lib/mynotary/client";
import type {
  MyNotaryRecordSummary,
  MyNotarySigner,
} from "@/lib/mynotary/types";

// Best-effort matcher: given a MyNotary contract that was just signed,
// try to attach it to the corresponding seller_project + property in
// Sillage so the dashboard funnel + per-advisor breakdown work.
//
// Sillage data model recap (the matching strategy follows from it):
//
//   - `properties` is the public listings catalog (synced from
//     Sweepbright). It carries `formatted_address`.
//   - `seller_leads` carries the lead `email` + a free-text
//     `property_address` (the property they want to sell).
//   - `seller_projects` is the work-in-progress kanban for an
//     accepted seller_lead. It has `seller_lead_id` but NO direct
//     `property_id` (because at lead intake the property is not yet
//     in the listings catalog).
//
// So the matching strategy (decreasing confidence, first hit wins):
//
//   1. email_exact (1.0)
//      A signer's email = `seller_leads.email`. We return the latest
//      seller_project tied to that lead (sellerProjectId), plus the
//      property_id from the seller_lead.property_address ↔ properties
//      lookup if we can do it.
//
//   2. address_exact (0.7)
//      The normalized property address on the MyNotary operation is
//      the same as a normalized `properties.formatted_address`. We
//      only attach the property; sellerProjectId remains null
//      unless we can recover a lead via property_address ILIKE.
//
//   3. address_fuzzy (0.4)
//      Same as above via pg_trgm similarity ≥ 0.6.
//
//   4. none (0.0)
//      Nothing found — the document lands in /admin/mynotary
//      "À rattacher" for a manager to fix manually.

type SellerLeadsReader = {
  from: (table: "seller_leads") => {
    select: (cols: string) => {
      in: (
        col: string,
        values: string[]
      ) => Promise<{
        data: Array<{ id: string; email: string | null; property_address: string | null }> | null;
        error: { message: string } | null;
      }>;
      ilike: (
        col: string,
        value: string
      ) => {
        limit: (n: number) => Promise<{
          data: Array<{ id: string; property_address: string | null }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

type SellerProjectsReader = {
  from: (table: "seller_projects") => {
    select: (cols: string) => {
      in: (
        col: string,
        values: string[]
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean }
        ) => {
          limit: (n: number) => Promise<{
            data: Array<{ id: string; seller_lead_id: string | null }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

type PropertiesReader = {
  from: (table: "properties") => {
    select: (cols: string) => {
      ilike: (
        col: string,
        value: string
      ) => {
        limit: (n: number) => Promise<{
          data: Array<{ id: string; formatted_address: string | null }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

type MatchAddressRpc = {
  rpc: (
    name: "mynotary_match_address",
    args: { p_query: string; p_min_similarity: number; p_limit: number }
  ) => Promise<{
    data: Array<{ property_id: string; similarity: number }> | null;
    error: { message: string } | null;
  }>;
};

type MatchOutcome = {
  sellerProjectId: string | null;
  propertyId: string | null;
  confidence: number;
  method: "email_exact" | "address_exact" | "address_fuzzy" | "none";
};

export type AutoMatchInput = {
  mynotaryOperationId: string;
  signers: MyNotarySigner[];
  inlineAddress?: string | null;
};

const normalizeAddress = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const normalizeEmail = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw.trim().toLowerCase();
};

const isPropertyRecord = (record: MyNotaryRecordSummary): boolean => {
  const t = (record.recordType ?? "").toLowerCase();
  return (
    t.includes("property") ||
    t.includes("bien") ||
    t.includes("logement") ||
    t.includes("immeuble") ||
    t === "estate"
  );
};

const extractAddressFromRecord = (
  record: MyNotaryRecordSummary
): string | null => {
  const f = record.fields ?? {};
  const tryKeys = [
    "formattedAddress",
    "addressLine1",
    "address",
    "street",
    "adresse",
  ];
  for (const k of tryKeys) {
    const v = f[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  const street = typeof f.street === "string" ? f.street : "";
  const number = typeof f.streetNumber === "string" ? f.streetNumber : "";
  const postal = typeof f.postalCode === "string" ? f.postalCode : "";
  const city = typeof f.city === "string" ? f.city : "";
  const concat = [number, street, postal, city].filter(Boolean).join(" ");
  return concat.trim().length > 0 ? concat.trim() : null;
};

const fetchOperationAddress = async (
  mynotaryOperationId: string
): Promise<string | null> => {
  try {
    const operation = await getOperation(mynotaryOperationId);
    const records = Array.isArray(operation.records) ? operation.records : [];
    for (const record of records) {
      if (!isPropertyRecord(record)) continue;
      if (!record.fields) {
        try {
          const detail = await getRecord(String(record.recordId));
          const addr = extractAddressFromRecord(detail);
          if (addr) return addr;
        } catch {
          // ignore and continue scanning other records
        }
        continue;
      }
      const addr = extractAddressFromRecord(record);
      if (addr) return addr;
    }
  } catch {
    return null;
  }
  return null;
};

const findByEmail = async (
  emails: string[]
): Promise<{
  sellerProjectId: string | null;
  propertyId: string | null;
  leadAddress: string | null;
} | null> => {
  if (emails.length === 0) return null;
  const leadsClient = supabaseAdmin as unknown as SellerLeadsReader;
  const { data: leads } = await leadsClient
    .from("seller_leads")
    .select("id, email, property_address")
    .in("email", emails);
  const leadList = leads ?? [];
  if (leadList.length === 0) return null;

  const leadIds = leadList.map((l) => l.id);
  const leadAddress = leadList.find((l) => l.property_address)?.property_address ?? null;

  const projectsClient = supabaseAdmin as unknown as SellerProjectsReader;
  const { data: projects } = await projectsClient
    .from("seller_projects")
    .select("id, seller_lead_id")
    .in("seller_lead_id", leadIds)
    .order("updated_at", { ascending: false })
    .limit(1);

  return {
    sellerProjectId: projects && projects.length > 0 ? projects[0].id : null,
    propertyId: null,
    leadAddress,
  };
};

const findPropertyByExactAddress = async (
  normalizedAddress: string
): Promise<string | null> => {
  if (!normalizedAddress) return null;
  const propertiesClient = supabaseAdmin as unknown as PropertiesReader;
  const tokens = normalizedAddress.split(" ").slice(0, 4).join(" ");
  const { data } = await propertiesClient
    .from("properties")
    .select("id, formatted_address")
    .ilike("formatted_address", `%${tokens}%`)
    .limit(20);
  if (!data) return null;
  for (const row of data) {
    if (normalizeAddress(row.formatted_address) === normalizedAddress) {
      return row.id;
    }
  }
  return null;
};

const findPropertyByFuzzyAddress = async (
  normalizedAddress: string
): Promise<string | null> => {
  if (!normalizedAddress) return null;
  const rpcClient = supabaseAdmin as unknown as MatchAddressRpc;
  const { data, error } = await rpcClient.rpc("mynotary_match_address", {
    p_query: normalizedAddress,
    p_min_similarity: 0.6,
    p_limit: 1,
  });
  if (error || !data || data.length === 0) return null;
  return data[0].property_id ?? null;
};

export const matchSignedDocument = async (
  input: AutoMatchInput
): Promise<MatchOutcome> => {
  const emails = Array.from(
    new Set(
      (input.signers ?? [])
        .map((s) => normalizeEmail(s.email))
        .filter((e) => e.length > 0)
    )
  );

  if (emails.length > 0) {
    const byEmail = await findByEmail(emails);
    if (byEmail && byEmail.sellerProjectId) {
      return {
        sellerProjectId: byEmail.sellerProjectId,
        propertyId: byEmail.propertyId,
        confidence: 1,
        method: "email_exact",
      };
    }
  }

  const rawAddress =
    input.inlineAddress && input.inlineAddress.length > 0
      ? input.inlineAddress
      : await fetchOperationAddress(input.mynotaryOperationId);
  const normalizedAddress = normalizeAddress(rawAddress);

  if (normalizedAddress) {
    const exactPropertyId = await findPropertyByExactAddress(normalizedAddress);
    if (exactPropertyId) {
      return {
        sellerProjectId: null,
        propertyId: exactPropertyId,
        confidence: 0.7,
        method: "address_exact",
      };
    }

    const fuzzyPropertyId = await findPropertyByFuzzyAddress(normalizedAddress);
    if (fuzzyPropertyId) {
      return {
        sellerProjectId: null,
        propertyId: fuzzyPropertyId,
        confidence: 0.4,
        method: "address_fuzzy",
      };
    }
  }

  return {
    sellerProjectId: null,
    propertyId: null,
    confidence: 0,
    method: "none",
  };
};

export const __testing__ = { normalizeAddress, normalizeEmail };
