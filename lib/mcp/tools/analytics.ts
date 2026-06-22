import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getTransactionById,
  listTransactions,
} from "@/services/transactions/transaction.service";
import { listPresentedPropertiesForProject } from "@/services/buyers/buyer-presented-property.service";
import type {
  TransactionBusinessType,
  TransactionStatus,
} from "@/types/domain/transactions";

// Server-side allowlist guard. The DB function public.analytics_run_select is
// the authoritative gate (read-only, single statement, capped, security
// definer with its own keyword/relation blocklist). This pre-check fails fast
// and, crucially, enforces an ALLOWLIST: every FROM/JOIN target must be an
// analytics_* view (or a CTE declared in the same query). That keeps the
// copilot away from raw, PII-bearing tables even by accident.
const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|copy|merge|comment|vacuum|analyze|reindex|do|call|lock|set|reset|prepare|listen|notify)\b/i;
const FORBIDDEN_TOKENS = /(raw_payload|information_schema|pg_catalog|pg_)/i;

const collectCteNames = (query: string): Set<string> => {
  const names = new Set<string>();
  if (!/^with\s/i.test(query)) return names;
  const re = /(?:\bwith\b|,)\s*("?)([a-z_][a-z0-9_]*)\1\s+as\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(query)) !== null) {
    names.add(match[2].toLowerCase());
  }
  return names;
};

const validateAnalyticsQuery = (query: string): string | null => {
  const trimmed = query.trim().replace(/;\s*$/, "");
  if (trimmed.includes(";")) return "Une seule requête est autorisée.";
  if (!/^(select|with)\s/i.test(trimmed)) {
    return "Seules les requêtes SELECT / WITH sont autorisées.";
  }
  if (FORBIDDEN_KEYWORDS.test(trimmed)) return "Mot-clé interdit dans la requête.";
  if (FORBIDDEN_TOKENS.test(trimmed)) return "Requête restreinte aux vues analytics_*.";

  const cteNames = collectCteNames(trimmed);
  const targetRe = /\b(?:from|join)\s+("?)([a-z_][a-z0-9_.]*)\1/gi;
  let match: RegExpExecArray | null;
  let sawTarget = false;
  while ((match = targetRe.exec(trimmed)) !== null) {
    sawTarget = true;
    const raw = match[2].toLowerCase();
    const relation = raw.includes(".") ? raw.slice(raw.lastIndexOf(".") + 1) : raw;
    if (relation.startsWith("analytics_") || cteNames.has(relation)) continue;
    return `Relation non autorisée : ${relation}. Seules les vues analytics_* sont accessibles.`;
  }
  if (!sawTarget) return "La requête doit lire au moins une vue analytics_*.";
  return null;
};

export const analyticsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "analytics.query",
    description:
      "Exécute une requête SQL en LECTURE SEULE sur les vues analytics_* (sans PII client). " +
      "Vues disponibles : analytics_transactions (id, business_type, status, assigned_admin_profile_id, advisor_name, mandate_price_amount, agreed_price_amount, deed_price_amount, honoraires_amount, honoraires_source, mandate_signed_at, offer_received_at, preliminary_sale_signed_at, deed_signed_at, cancelled_at, created_at, city, postal_code, property_type) ; " +
      "analytics_revenue_realized_monthly (month, assigned_admin_profile_id, advisor_name, deals_closed, ca_realized) ; " +
      "analytics_revenue_pipeline (id, assigned_admin_profile_id, advisor_name, status, honoraires_amount, weight, weighted_honoraires) ; " +
      "analytics_advisor_performance (advisor_id, advisor_name, deals_closed, ca_realized, deals_pipeline) ; " +
      "analytics_market_trends (month, city, postal_code, property_type, business_type, observations, avg_price_per_m2, min_price_per_m2, max_price_per_m2). " +
      "CA réalisé = honoraires des transactions dont l'acte est signé (deed_signed_at). CA prévisionnel = pipeline pondéré. Une seule requête SELECT, max 1000 lignes.",
    version: "1.0.0",
    readsPii: false,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 8, maxLength: 4000 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { query } = (input ?? {}) as { query?: string };
      if (typeof query !== "string" || query.trim().length === 0) {
        throw new Error("Requête vide.");
      }
      const validationError = validateAnalyticsQuery(query);
      if (validationError) {
        throw new Error(validationError);
      }
      const { data, error } = await supabaseAdmin.rpc("analytics_run_select", {
        query,
      });
      if (error) {
        throw new Error(`analytics.query: ${error.message}`);
      }
      const rows = Array.isArray(data) ? data : [];
      return { rows, count: rows.length };
    },
  },
  {
    name: "transactions.search",
    description:
      "Liste les transactions (mandats / compromis / actes) avec filtres statut / type / conseiller. Données financières internes, sans PII client.",
    version: "1.0.0",
    readsPii: false,
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["prospect", "mandate", "offer", "compromis", "acte", "cancelled"],
        },
        businessType: { type: "string", enum: ["sale", "rental"] },
        assignedAdminProfileId: { type: "string", format: "uuid" },
        limit: { type: "number", minimum: 1, maximum: 200 },
        offset: { type: "number", minimum: 0 },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const p = (input ?? {}) as {
        status?: TransactionStatus;
        businessType?: TransactionBusinessType;
        assignedAdminProfileId?: string;
        limit?: number;
        offset?: number;
      };
      const { items, count } = await listTransactions({
        status: p.status,
        businessType: p.businessType,
        assignedAdminProfileId: p.assignedAdminProfileId,
        limit: p.limit,
        offset: p.offset,
      });
      return { items, count };
    },
  },
  {
    name: "transactions.get",
    description:
      "Récupère une transaction par id avec son historique d'honoraires (sans PII client : noms/contacts des parties exclus).",
    version: "1.0.0",
    readsPii: false,
    inputSchema: {
      type: "object",
      properties: { transactionId: { type: "string", format: "uuid" } },
      required: ["transactionId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { transactionId } = (input ?? {}) as { transactionId?: string };
      if (!transactionId) throw new Error("transactionId requis.");
      const detail = await getTransactionById(transactionId);
      if (!detail) return { transaction: null };
      const { sellers, buyers, ...rest } = detail;
      return {
        transaction: rest,
        sellersCount: sellers.length,
        buyersCount: buyers.length,
      };
    },
  },
  {
    name: "market.observations_search",
    description:
      "Recherche des observations de marché (prix/m²) issues des estimations Loupe, filtrables par ville / code postal / type.",
    version: "1.0.0",
    readsPii: false,
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        postalCode: { type: "string" },
        propertyType: { type: "string" },
        businessType: { type: "string", enum: ["sale", "rental"] },
        sinceMonths: { type: "number", minimum: 1, maximum: 60 },
        limit: { type: "number", minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const p = (input ?? {}) as {
        city?: string;
        postalCode?: string;
        propertyType?: string;
        businessType?: "sale" | "rental";
        sinceMonths?: number;
        limit?: number;
      };
      const limit = Math.min(Math.max(p.limit ?? 50, 1), 200);
      let query = supabaseAdmin
        .from("market_observations")
        .select(
          "id, observed_at, city, postal_code, property_type, business_type, price_per_m2, price_per_m2_low, price_per_m2_high, estimated_price, living_area_m2, currency"
        )
        .order("observed_at", { ascending: false })
        .limit(limit);

      if (p.city?.trim()) query = query.ilike("city", `%${p.city.trim()}%`);
      if (p.postalCode?.trim()) query = query.eq("postal_code", p.postalCode.trim());
      if (p.propertyType?.trim()) query = query.eq("property_type", p.propertyType.trim());
      if (p.businessType) query = query.eq("business_type", p.businessType);
      if (typeof p.sinceMonths === "number") {
        const since = new Date();
        since.setMonth(since.getMonth() - p.sinceMonths);
        query = query.gte("observed_at", since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { items: data ?? [], count: data?.length ?? 0 };
    },
  },
  {
    name: "buyer_presented.list_for_project",
    description:
      "Liste les biens présentés à un projet acquéreur (groupes + leurs documents), pour analyse côté admin.",
    version: "1.0.0",
    readsPii: false,
    inputSchema: {
      type: "object",
      properties: { clientProjectId: { type: "string", format: "uuid" } },
      required: ["clientProjectId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { clientProjectId } = (input ?? {}) as { clientProjectId?: string };
      if (!clientProjectId) throw new Error("clientProjectId requis.");
      const groups = await listPresentedPropertiesForProject(clientProjectId);
      return { items: groups, count: groups.length };
    },
  },
];
