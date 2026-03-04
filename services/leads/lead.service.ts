import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanitizeAuditInput } from "@/lib/audit/sanitize";
import {
  getZoneBySlug,
  inferZoneFromText,
  type ZoneCatalogEntry,
} from "@/lib/scoring/zone-catalog";
import { getRuntimeZoneCatalog } from "@/lib/scoring/zone-repository";

export type LeadInput = {
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  timeline?: string;
  budget?: number;
  budgetMin?: number;
  budgetMax?: number;
  zoneTier?: string;
  zoneSlug?: string;
  zoneText?: string;
  propertyType?: string;
  rooms?: number;
};

export type LeadExecutionMeta = {
  requestId?: string;
  actor?: "system" | "anonymous" | "user";
  toolName?: string;
  toolVersion?: string;
};

export type LeadCreateResult =
  | { status: "created"; leadId: string; auditLogged: boolean }
  | { status: "failed"; reason: string };

export const createLead = async (
  input: LeadInput,
  meta?: LeadExecutionMeta
): Promise<LeadCreateResult> => {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      message: input.message?.trim() || null,
      source: input.source?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return {
      status: "failed",
      reason: error?.message ?? "Insertion failed.",
    };
  }

  const auditResult = await supabaseAdmin.from("audit_log").insert({
    actor_type: meta?.actor ?? "anonymous",
    actor_id: null,
    action: "lead_created",
    entity_type: "lead",
    entity_id: data.id,
    data: {
      execution: {
        request_id: meta?.requestId ?? null,
        tool_name: meta?.toolName ?? null,
        tool_version: meta?.toolVersion ?? null,
      },
      input: sanitizeAuditInput({
        source: input.source ?? null,
        email: input.email.trim().toLowerCase(),
        phone: input.phone ?? null,
        message: input.message ?? null,
        fullName: input.fullName,
      }),
    },
  });

  return {
    status: "created",
    leadId: data.id,
    auditLogged: !auditResult.error,
  };
};

export type LeadScoreResult = {
  status: "scored";
  score: number;
  tier: "low" | "medium" | "high";
  segment: "cold" | "warm" | "hot";
  zoneCatalogVersion: string;
  zoneResolution: {
    source: "explicit_slug" | "inferred_text" | "explicit_tier" | "unresolved";
    confidence: "high" | "medium" | "low";
    resolvedSlug: string | null;
    resolvedCity: string | null;
  };
  breakdown: {
    urgency: number;
    budget: number;
    zone: number;
    quality: number;
    penalty: number;
  };
  reasons: string[];
  auditLogged: boolean;
};

const clampScore = (value: number) => {
  return Math.min(100, Math.max(0, value));
};

const normalizeToken = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
};

const resolveTimelineScore = (timeline?: string) => {
  if (!timeline) {
    return { score: 0, reason: "Urgence non renseignée", missing: true };
  }

  const normalized = normalizeToken(timeline);
  if (normalized === "immediat" || normalized === "immediate") {
    return { score: 40, reason: "Projet immediat (<= 30 jours)", missing: false };
  }
  if (normalized === "ce_trimestre") {
    return { score: 30, reason: "Projet ce trimestre", missing: false };
  }
  if (normalized === "cette_annee") {
    return { score: 18, reason: "Projet cette annee", missing: false };
  }
  if (normalized === "sans_echeance") {
    return { score: 6, reason: "Projet sans echeance claire", missing: false };
  }

  return { score: 0, reason: "Urgence non reconnue", missing: true };
};

const resolveBudgetValue = (input: LeadInput) => {
  if (typeof input.budget === "number" && Number.isFinite(input.budget)) {
    return input.budget;
  }

  const min = input.budgetMin;
  const max = input.budgetMax;
  if (typeof min === "number" && typeof max === "number") {
    return (min + max) / 2;
  }
  if (typeof min === "number") return min;
  if (typeof max === "number") return max;
  return null;
};

const resolveBudgetScore = (input: LeadInput) => {
  const budget = resolveBudgetValue(input);
  if (budget === null || !Number.isFinite(budget)) {
    return { score: 0, reason: "Budget non renseigne", missing: true };
  }

  if (budget > 3_000_000) {
    return { score: 30, reason: "Budget > 3M EUR", missing: false };
  }
  if (budget >= 1_000_000) {
    return { score: 24, reason: "Budget entre 1M et 3M EUR", missing: false };
  }
  if (budget >= 500_000) {
    return { score: 16, reason: "Budget entre 500k et 1M EUR", missing: false };
  }
  return { score: 8, reason: "Budget < 500k EUR", missing: false };
};

const resolveZoneScore = (
  zoneTier?: string,
  zoneText?: string,
  zoneSlug?: string,
  catalog?: ZoneCatalogEntry[]
) => {
  const bySlug = getZoneBySlug(zoneSlug, catalog);
  if (bySlug) {
    return {
      score: bySlug.score,
      reason: `Zone ${bySlug.slug} (${bySlug.city}, slug explicite)`,
      missing: false,
      source: "explicit_slug" as const,
      confidence: "high" as const,
      effectiveTier: zoneTier?.trim() || null,
      resolvedSlug: bySlug.slug,
      resolvedCity: bySlug.city,
    };
  }

  const byText = inferZoneFromText(zoneText, catalog);
  if (byText) {
    return {
      score: byText.score,
      reason: `Zone ${byText.slug} (${byText.city}, texte infere)`,
      missing: false,
      source: "inferred_text" as const,
      confidence: "medium" as const,
      effectiveTier: zoneTier?.trim() || null,
      resolvedSlug: byText.slug,
      resolvedCity: byText.city,
    };
  }

  const explicitTier = zoneTier?.trim() ? zoneTier : null;
  if (!explicitTier) {
    return {
      score: 0,
      reason: "Zone non renseignee",
      missing: true,
      source: "unresolved" as const,
      confidence: "low" as const,
      effectiveTier: null,
      resolvedSlug: null,
      resolvedCity: null,
    };
  }

  const normalized = normalizeToken(explicitTier);
  if (normalized === "ultra-prime" || normalized === "ultra_prime") {
    return {
      score: 15,
      reason: "Zone ultra-prime (tier explicite)",
      missing: false,
      source: "explicit_tier" as const,
      confidence: "medium" as const,
      effectiveTier: "ultra-prime",
      resolvedSlug: null,
      resolvedCity: null,
    };
  }
  if (normalized === "prime") {
    return {
      score: 12,
      reason: "Zone prime (tier explicite)",
      missing: false,
      source: "explicit_tier" as const,
      confidence: "medium" as const,
      effectiveTier: "prime",
      resolvedSlug: null,
      resolvedCity: null,
    };
  }
  if (normalized === "standard") {
    return {
      score: 8,
      reason: "Zone standard (tier explicite)",
      missing: false,
      source: "explicit_tier" as const,
      confidence: "medium" as const,
      effectiveTier: "standard",
      resolvedSlug: null,
      resolvedCity: null,
    };
  }
  if (normalized === "hors-zone" || normalized === "hors_zone") {
    return {
      score: 3,
      reason: "Zone hors-zone (tier explicite)",
      missing: false,
      source: "explicit_tier" as const,
      confidence: "medium" as const,
      effectiveTier: "hors-zone",
      resolvedSlug: null,
      resolvedCity: null,
    };
  }
  return {
    score: 0,
    reason: "Zone non reconnue",
    missing: true,
    source: "unresolved" as const,
    confidence: "low" as const,
    effectiveTier: null,
    resolvedSlug: null,
    resolvedCity: null,
  };
};

const resolveQualityScore = (input: LeadInput) => {
  const message = input.message?.trim() ?? "";
  const messageLength = message.length;

  let messageScore = 0;
  if (messageLength >= 180) messageScore = 8;
  else if (messageLength >= 100) messageScore = 6;
  else if (messageLength >= 40) messageScore = 4;
  else if (messageLength > 0) messageScore = 2;

  const hasBudget =
    resolveBudgetValue(input) !== null ||
    typeof input.budgetMin === "number" ||
    typeof input.budgetMax === "number";
  const structuredFields = [
    Boolean(input.timeline?.trim()),
    hasBudget,
    Boolean(input.zoneTier?.trim() || input.zoneSlug?.trim() || input.zoneText?.trim()),
    Boolean(input.propertyType?.trim()),
    typeof input.rooms === "number" && Number.isFinite(input.rooms),
  ];
  const structuredCount = structuredFields.filter(Boolean).length;

  let structuredScore = 0;
  if (structuredCount >= 5) structuredScore = 7;
  else if (structuredCount === 4) structuredScore = 6;
  else if (structuredCount === 3) structuredScore = 5;
  else if (structuredCount === 2) structuredScore = 3;
  else if (structuredCount === 1) structuredScore = 1;

  return {
    score: messageScore + structuredScore,
    reason: `Qualite demande: message(${messageScore}/8) + structure(${structuredScore}/7)`,
  };
};

export const scoreLead = async (
  input: LeadInput,
  meta?: LeadExecutionMeta
): Promise<LeadScoreResult> => {
  const runtimeZoneCatalog = await getRuntimeZoneCatalog();

  let score = 0;
  const reasons: string[] = [];
  let penalty = 0;

  const urgency = resolveTimelineScore(input.timeline);
  score += urgency.score;
  reasons.push(urgency.reason);
  if (urgency.missing) penalty -= 5;

  const budget = resolveBudgetScore(input);
  score += budget.score;
  reasons.push(budget.reason);
  if (budget.missing) penalty -= 5;

  const zone = resolveZoneScore(
    input.zoneTier,
    input.zoneText,
    input.zoneSlug,
    runtimeZoneCatalog.catalog
  );
  score += zone.score;
  reasons.push(zone.reason);
  if (zone.missing) penalty -= 5;

  const quality = resolveQualityScore(input);
  score += quality.score;
  reasons.push(quality.reason);

  if (input.phone && input.phone.trim().length > 0) {
    score += 2;
    reasons.push("Telephone renseigne");
  }

  if (input.source && input.source.trim().length > 0) {
    score += 1;
    reasons.push("Source renseignee");
  }

  if (input.email.endsWith("@gmail.com") || input.email.endsWith("@yahoo.com")) {
    penalty -= 2;
    reasons.push("Email grand public (malus modere)");
  }

  const finalScore = clampScore(score + penalty);
  const segment = finalScore >= 75 ? "hot" : finalScore >= 50 ? "warm" : "cold";
  const tier = segment === "hot" ? "high" : segment === "warm" ? "medium" : "low";
  const sanitizedInput = sanitizeAuditInput({
    source: input.source ?? null,
    email: input.email.trim().toLowerCase(),
    phone: input.phone ?? null,
    message: input.message ?? null,
    fullName: input.fullName,
    timeline: input.timeline ?? null,
    budget: input.budget ?? null,
    budgetMin: input.budgetMin ?? null,
    budgetMax: input.budgetMax ?? null,
    zoneTier: input.zoneTier ?? null,
    zoneSlug: input.zoneSlug ?? null,
    zoneTierResolved: zone.effectiveTier,
    zoneSlugResolved: zone.resolvedSlug,
    zoneCityResolved: zone.resolvedCity,
    zoneText: input.zoneText ?? null,
    propertyType: input.propertyType ?? null,
    rooms: input.rooms ?? null,
  });

  const auditResult = await supabaseAdmin.from("audit_log").insert({
    actor_type: meta?.actor ?? "anonymous",
    actor_id: null,
    action: "lead_scored",
    entity_type: "lead",
    entity_id: null,
    data: {
      execution: {
        request_id: meta?.requestId ?? null,
        tool_name: meta?.toolName ?? null,
        tool_version: meta?.toolVersion ?? null,
      },
      input: sanitizedInput,
      output: {
        score: finalScore,
        tier,
        segment,
        zone_catalog_version: runtimeZoneCatalog.version,
        zone_catalog_source: runtimeZoneCatalog.source,
        zone_resolution: {
          source: zone.source,
          confidence: zone.confidence,
          resolved_slug: zone.resolvedSlug,
          resolved_city: zone.resolvedCity,
        },
        breakdown: {
          urgency: urgency.score,
          budget: budget.score,
          zone: zone.score,
          quality: quality.score,
          penalty,
        },
        reasons,
      },
    },
  });

  return {
    status: "scored",
    score: finalScore,
    tier,
    segment,
    zoneCatalogVersion: runtimeZoneCatalog.version,
    zoneResolution: {
      source: zone.source,
      confidence: zone.confidence,
      resolvedSlug: zone.resolvedSlug,
      resolvedCity: zone.resolvedCity,
    },
    breakdown: {
      urgency: urgency.score,
      budget: budget.score,
      zone: zone.score,
      quality: quality.score,
      penalty,
    },
    reasons,
    auditLogged: !auditResult.error,
  };
};
