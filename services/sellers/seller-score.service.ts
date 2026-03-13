import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { getSellerMetadataSections, mergeSellerMetadata } from "./seller-metadata";

type SellerLeadForScoring = {
  id: string;
  phone: string | null;
  email: string;
  city: string | null;
  postal_code: string | null;
  timeline: string | null;
  property_type: string | null;
  diagnostics_ready: boolean | null;
  diagnostics_support_needed: boolean | null;
  syndic_docs_ready: boolean | null;
  syndic_support_needed: boolean | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
};

export type SellerScoreResult = {
  score: number;
  segment: "priority_a" | "priority_b" | "priority_c";
  nextBestAction:
    | "book_listing_appointment"
    | "objection_handling_call"
    | "differentiation_call_2h"
    | "callback_with_admin_support"
    | "qualify_call_24h"
    | "nurture_sequence";
  breakdown: {
    intent: number;
    asset: number;
    readiness: number;
    objectionDetected: boolean;
    competitorRiskDetected: boolean;
    topFloorBonus: number;
    seaViewBonus: number;
  };
  reasons: string[];
  eventId: string;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const normalize = (value: string | null | undefined) => {
  return (value ?? "").trim().toLowerCase();
};

const normalizeFreeText = (value: string | null | undefined) => {
  return normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
};

const isPrimeCity = (city: string | null) => {
  const normalized = normalize(city);
  return [
    "nice",
    "cannes",
    "antibes",
    "cagnes-sur-mer",
    "menton",
    "mougins",
    "mandelieu-la-napoule",
    "saint-jean-cap-ferrat",
  ].includes(normalized);
};

const computeIntent = (lead: SellerLeadForScoring, reasons: string[]) => {
  let points = 0;
  const timeline = normalize(lead.timeline);

  if (timeline === "immediate") {
    points += 25;
    reasons.push("Intention forte: projet vendeur immediat.");
  } else if (timeline === "3_months") {
    points += 20;
    reasons.push("Intention elevee: projet vendeur sous 3 mois.");
  } else if (timeline === "6_months") {
    points += 14;
    reasons.push("Intention moderee: projet vendeur sous 6 mois.");
  } else if (timeline === "future") {
    points += 8;
    reasons.push("Projet vendeur futur.");
  }

  if (lead.phone?.trim()) {
    points += 10;
    reasons.push("Contactabilite forte: telephone renseigne.");
  }

  const messageLength = (lead.message ?? "").trim().length;
  if (messageLength >= 80) {
    points += 5;
    reasons.push("Contexte vendeur detaille.");
  }

  return clamp(points, 0, 40);
};

const computeAsset = (lead: SellerLeadForScoring, reasons: string[]) => {
  let points = 0;
  let topFloorBonus = 0;
  let seaViewBonus = 0;

  if (isPrimeCity(lead.city)) {
    points += 20;
    reasons.push("Actif dans une zone coeur de cible.");
  } else if (lead.city?.trim()) {
    points += 10;
    reasons.push("Actif hors zone coeur de cible.");
  }

  const propertyType = normalize(lead.property_type);
  if (propertyType === "villa" || propertyType === "maison") {
    points += 10;
    reasons.push("Type de bien a fort potentiel commercial.");
  } else if (propertyType === "appartement") {
    points += 8;
  } else if (propertyType) {
    points += 5;
  }

  if ((lead.postal_code ?? "").startsWith("06")) {
    points += 5;
  }

  const { propertyDetails } = getSellerMetadataSections(lead.metadata);

  const isTopFloor =
    typeof propertyDetails?.is_top_floor === "boolean"
      ? propertyDetails.is_top_floor
      : null;
  if (isTopFloor === true) {
    topFloorBonus = 6;
    points += topFloorBonus;
    reasons.push("Atout actif: bien situe au dernier etage.");
  }

  const seaView = normalize(
    typeof propertyDetails?.sea_view === "string" ? propertyDetails.sea_view : null
  );
  if (seaView === "lateral") {
    seaViewBonus = 2;
    points += seaViewBonus;
    reasons.push("Atout actif: vue mer laterale.");
  } else if (seaView === "classic") {
    seaViewBonus = 5;
    points += seaViewBonus;
    reasons.push("Atout actif: vue mer classique.");
  } else if (seaView === "panoramic") {
    seaViewBonus = 9;
    points += seaViewBonus;
    reasons.push("Atout actif: vue mer panoramique.");
  }

  return {
    points: clamp(points, 0, 50),
    topFloorBonus,
    seaViewBonus,
  };
};

const computeReadiness = (lead: SellerLeadForScoring, reasons: string[]) => {
  let points = 0;

  if (lead.diagnostics_ready === true) {
    points += 8;
  } else if (lead.diagnostics_support_needed === true) {
    points += 6;
    reasons.push("Diagnostics non faits mais accompagnement accepte.");
  } else if (lead.diagnostics_ready === false) {
    points += 1;
  }

  if (lead.syndic_docs_ready === true) {
    points += 8;
  } else if (lead.syndic_support_needed === true) {
    points += 6;
    reasons.push("Documents syndic incomplets mais accompagnement accepte.");
  } else if (lead.syndic_docs_ready === false) {
    points += 1;
  }

  if (lead.city?.trim()) points += 3;

  return clamp(points, 0, 25);
};

const detectAgencyObjection = (message: string | null) => {
  const text = normalizeFreeText(message);
  if (!text) return false;

  return [
    /ne sais pas si je veux passer par une agence/,
    /je ne sais pas si je veux passer par une agence/,
    /hesite.*agence/,
    /pas sur.*agence/,
    /sans passer par une agence/,
    /sans agence/,
    /pas envie de passer par une agence/,
    /je compare les agences/,
  ].some((pattern) => pattern.test(text));
};

const detectCompetitorRisk = (message: string | null) => {
  const text = normalizeFreeText(message);
  if (!text) return false;

  return [
    /reseau d[' ]?agences? national/,
    /reseau national d[' ]?agences?/,
    /gros reseau d[' ]?agences?/,
    /grand reseau d[' ]?agences?/,
    /passer par un reseau/,
    /passer par un grand groupe/,
    /franchise nationale/,
    /orpi|laforet|century 21|era|guy hoquet|foncia|nestenn/i,
  ].some((pattern) => pattern.test(text));
};

const computeNextBestAction = (
  lead: SellerLeadForScoring,
  score: number,
  readiness: number,
  objectionDetected: boolean,
  competitorRiskDetected: boolean
): SellerScoreResult["nextBestAction"] => {
  const timeline = normalize(lead.timeline);
  const fastTimeline = timeline === "immediate" || timeline === "3_months";

  if (competitorRiskDetected) {
    return "differentiation_call_2h";
  }

  if (objectionDetected) {
    return "objection_handling_call";
  }

  if (score >= 75 && readiness >= 18) {
    return "book_listing_appointment";
  }

  if (
    fastTimeline &&
    (lead.diagnostics_support_needed === true || lead.syndic_support_needed === true)
  ) {
    return "callback_with_admin_support";
  }

  if (score >= 55) {
    return "qualify_call_24h";
  }

  return "nurture_sequence";
};

export const scoreSellerLead = async (sellerLeadId: string): Promise<SellerScoreResult> => {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("seller_leads")
    .select(
      "id, phone, email, city, postal_code, timeline, property_type, diagnostics_ready, diagnostics_support_needed, syndic_docs_ready, syndic_support_needed, message, metadata"
    )
    .eq("id", sellerLeadId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead vendeur introuvable.");
  }

  const reasons: string[] = [];
  let intent = computeIntent(lead as SellerLeadForScoring, reasons);
  const assetResult = computeAsset(lead as SellerLeadForScoring, reasons);
  const asset = assetResult.points;
  const readiness = computeReadiness(lead as SellerLeadForScoring, reasons);
  const objectionDetected = detectAgencyObjection(lead.message);
  const competitorRiskDetected = detectCompetitorRisk(lead.message);

  if (objectionDetected) {
    intent = clamp(intent - 8, 0, 40);
    reasons.push(
      "Alerte objection: reticence detectee sur le passage par une agence, preparer un argumentaire de valeur."
    );
  }

  if (competitorRiskDetected) {
    reasons.push(
      "Alerte concurrence: vendeur attire par un reseau national, lancer un appel de differenciation boutique locale sous 2h."
    );
  }

  const score = clamp(intent + asset + readiness, 0, 100);
  const segment =
    score >= 75 ? "priority_a" : score >= 55 ? ("priority_b" as const) : ("priority_c" as const);
  const nextBestAction = computeNextBestAction(
    lead as SellerLeadForScoring,
    score,
    readiness,
    objectionDetected,
    competitorRiskDetected
  );

  const { data: event, error: eventError } = await supabaseAdmin
    .from("seller_scoring_events")
    .insert({
      seller_lead_id: sellerLeadId,
      score,
      segment,
      next_best_action: nextBestAction,
      breakdown: {
        intent,
        asset,
        readiness,
        objection_detected: objectionDetected,
        competitor_risk_detected: competitorRiskDetected,
        top_floor_bonus: assetResult.topFloorBonus,
        sea_view_bonus: assetResult.seaViewBonus,
      },
      reasons,
    })
    .select("id")
    .single();

  if (eventError || !event?.id) {
    throw new Error(eventError?.message ?? "Impossible de persister le scoring vendeur.");
  }

  const nextStatus =
    segment === "priority_a" ? "to_call" : segment === "priority_b" ? "qualified" : "new";

  const { raw: currentMetadata, scoring: currentScoring } = getSellerMetadataSections(lead.metadata);
  const safeMetadata = mergeSellerMetadata(currentMetadata, {
    scoring: {
      ...(currentScoring ?? {}),
      score,
      segment,
      next_best_action: nextBestAction,
      updated_at: new Date().toISOString(),
    },
  });

  await supabaseAdmin
    .from("seller_leads")
    .update({
      status: nextStatus,
      metadata: safeMetadata,
    })
    .eq("id", sellerLeadId);

  try {
    await emitDomainEvent({
      aggregateType: "seller_lead",
      aggregateId: sellerLeadId,
      eventName: "seller_lead.scored",
      payload: {
        score,
        segment,
        nextBestAction,
        eventId: event.id,
      },
    });
  } catch {
    // non-blocking: scoring should not fail if outbox is unavailable
  }

  return {
    score,
    segment,
    nextBestAction,
    breakdown: {
      intent,
      asset,
      readiness,
      objectionDetected,
      competitorRiskDetected,
      topFloorBonus: assetResult.topFloorBonus,
      seaViewBonus: assetResult.seaViewBonus,
    },
    reasons,
    eventId: event.id,
  };
};
