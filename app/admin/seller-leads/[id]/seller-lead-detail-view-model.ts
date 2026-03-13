import type { Database } from "@/types/db/supabase";
import { getSellerMetadataSections } from "@/services/sellers/seller-metadata";
import type { SellerAiInsight } from "@/types/domain/sellers";

type SellerLeadRow = Database["public"]["Tables"]["seller_leads"]["Row"];
type SellerScoreEventRow = Pick<
  Database["public"]["Tables"]["seller_scoring_events"]["Row"],
  "created_at" | "score" | "segment" | "next_best_action" | "breakdown"
>;

const formatStatusLabel = (status: string) => {
  switch (status) {
    case "new":
      return "Nouveau";
    case "to_call":
      return "A rappeler";
    case "qualified":
      return "Qualifié";
    case "closed":
      return "Clos";
    default:
      return status;
  }
};

const formatTimelineLabel = (timeline: string | null) => {
  switch (timeline) {
    case "immediate":
      return "Immediat";
    case "3_months":
      return "Sous 3 mois";
    case "6_months":
      return "Sous 6 mois";
    case "future":
      return "Projet futur";
    default:
      return timeline ?? "-";
  }
};

const formatOccupancyLabel = (occupancy: string | null) => {
  switch (occupancy) {
    case "owner_occupied":
      return "Proprietaire occupant";
    case "tenant_occupied":
      return "Bien loue";
    case "vacant":
      return "Bien vacant";
    default:
      return occupancy ?? "-";
  }
};

const formatSeaViewLabel = (value: string | null) => {
  switch (value) {
    case "none":
      return "Non";
    case "lateral":
      return "Vue mer laterale";
    case "classic":
      return "Vue mer classique";
    case "panoramic":
      return "Vue mer panoramique";
    default:
      return value ?? "-";
  }
};

const formatApartmentConditionLabel = (value: string | null) => {
  switch (value) {
    case "a_renover":
      return "A renover";
    case "renove_20_ans":
      return "Renove il y a 20 ans";
    case "renove_10_ans":
      return "Renove il y a 10 ans";
    case "renove_moins_5_ans":
      return "Renove il y a moins de 5 ans";
    case "neuf":
      return "Neuf";
    default:
      return value ?? "-";
  }
};

const formatBuildingAgeLabel = (value: string | null) => {
  switch (value) {
    case "ancien_1950":
      return "Ancien (jusqu'a 1950)";
    case "recent_1950_1970":
      return "Recent (1950-1970)";
    case "moderne_1980_today":
      return "Moderne (1980 - aujourd'hui)";
    default:
      return value ?? "-";
  }
};

const mapBreakdown = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const raw = value as {
    intent?: number;
    asset?: number;
    readiness?: number;
    objection_detected?: boolean;
    competitor_risk_detected?: boolean;
    top_floor_bonus?: number;
    sea_view_bonus?: number;
  };

  return {
    intent: raw.intent ?? 0,
    asset: raw.asset ?? 0,
    readiness: raw.readiness ?? 0,
    objectionDetected: raw.objection_detected ?? false,
    competitorRiskDetected: raw.competitor_risk_detected ?? false,
    topFloorBonus: raw.top_floor_bonus ?? 0,
    seaViewBonus: raw.sea_view_bonus ?? 0,
  };
};

const isSellerAiInsight = (value: unknown): value is SellerAiInsight => {
  if (!value || typeof value !== "object") return false;
  const insight = value as Record<string, unknown>;
  return (
    typeof insight.summary === "string" &&
    typeof insight.recommendedPitch === "string" &&
    typeof insight.nextAction === "string" &&
    typeof insight.generatedAt === "string" &&
    typeof insight.model === "string" &&
    (insight.competitorRiskLevel === "low" ||
      insight.competitorRiskLevel === "medium" ||
      insight.competitorRiskLevel === "high")
  );
};

export const buildSellerLeadDetailViewModel = (
  lead: SellerLeadRow,
  latestScoreEvent: SellerScoreEventRow | null
) => {
  const { propertyDetails, valuation, aiInsight } = getSellerMetadataSections(lead.metadata);
  const valuationNormalized =
    valuation?.normalized && typeof valuation.normalized === "object"
      ? (valuation.normalized as Record<string, unknown>)
      : null;

  return {
    statusLabel: formatStatusLabel(lead.status),
    timelineLabel: formatTimelineLabel(lead.timeline),
    occupancyLabel: formatOccupancyLabel(lead.occupancy_status),
    propertyDetailsView: {
      elevator:
        typeof propertyDetails?.elevator === "boolean"
          ? propertyDetails.elevator
            ? "Oui"
            : "Non"
          : "-",
      apartmentCondition:
        typeof propertyDetails?.apartment_condition === "string"
          ? formatApartmentConditionLabel(propertyDetails.apartment_condition)
          : "-",
      buildingAge:
        typeof propertyDetails?.building_age === "string"
          ? formatBuildingAgeLabel(propertyDetails.building_age)
          : "-",
      seaView:
        typeof propertyDetails?.sea_view === "string"
          ? formatSeaViewLabel(propertyDetails.sea_view)
          : "-",
      buildingTotalFloors:
        typeof propertyDetails?.building_total_floors === "number"
          ? String(propertyDetails.building_total_floors)
          : "-",
      isTopFloor:
        typeof propertyDetails?.is_top_floor === "boolean"
          ? propertyDetails.is_top_floor
            ? "Oui"
            : "Non"
          : "-",
    },
    propertyDetailsFormInitial: {
      livingArea: typeof propertyDetails?.living_area === "number" ? propertyDetails.living_area : null,
      rooms: typeof propertyDetails?.rooms === "number" ? propertyDetails.rooms : null,
      bedrooms: typeof propertyDetails?.bedrooms === "number" ? propertyDetails.bedrooms : null,
      floor: typeof propertyDetails?.floor === "string" ? propertyDetails.floor : null,
      buildingTotalFloors:
        typeof propertyDetails?.building_total_floors === "number"
          ? propertyDetails.building_total_floors
          : null,
      isTopFloor:
        typeof propertyDetails?.is_top_floor === "boolean" ? propertyDetails.is_top_floor : null,
      condition: typeof propertyDetails?.condition === "string" ? propertyDetails.condition : null,
      elevator: typeof propertyDetails?.elevator === "boolean" ? propertyDetails.elevator : null,
      apartmentCondition:
        typeof propertyDetails?.apartment_condition === "string"
          ? propertyDetails.apartment_condition
          : null,
      buildingAge:
        typeof propertyDetails?.building_age === "string" ? propertyDetails.building_age : null,
      seaView: typeof propertyDetails?.sea_view === "string" ? propertyDetails.sea_view : null,
      valuationLow:
        typeof propertyDetails?.valuation_low === "number" ? propertyDetails.valuation_low : null,
      valuationHigh:
        typeof propertyDetails?.valuation_high === "number" ? propertyDetails.valuation_high : null,
      notes: typeof propertyDetails?.notes === "string" ? propertyDetails.notes : null,
    },
    valuationSummary: valuation
      ? {
          provider: typeof valuation.provider === "string" ? valuation.provider : null,
          syncedAt: typeof valuation.synced_at === "string" ? valuation.synced_at : null,
          source: typeof valuation.source === "string" ? valuation.source : null,
          addressLabel:
            valuationNormalized && typeof valuationNormalized.addressLabel === "string"
              ? valuationNormalized.addressLabel
              : null,
          cityName:
            valuationNormalized && typeof valuationNormalized.cityName === "string"
              ? valuationNormalized.cityName
              : null,
          cityZipCode:
            valuationNormalized && typeof valuationNormalized.cityZipCode === "string"
              ? valuationNormalized.cityZipCode
              : null,
          type:
            valuationNormalized && typeof valuationNormalized.type === "string"
              ? valuationNormalized.type
              : null,
          livingSpaceArea:
            valuationNormalized && typeof valuationNormalized.livingSpaceArea === "number"
              ? valuationNormalized.livingSpaceArea
              : null,
          rooms:
            valuationNormalized && typeof valuationNormalized.rooms === "number"
              ? valuationNormalized.rooms
              : null,
          valuationPrice:
            valuationNormalized && typeof valuationNormalized.valuationPrice === "number"
              ? valuationNormalized.valuationPrice
              : null,
          valuationPriceLow:
            valuationNormalized && typeof valuationNormalized.valuationPriceLow === "number"
              ? valuationNormalized.valuationPriceLow
              : null,
          valuationPriceHigh:
            valuationNormalized && typeof valuationNormalized.valuationPriceHigh === "number"
              ? valuationNormalized.valuationPriceHigh
              : null,
        }
      : null,
    latestScore: latestScoreEvent
      ? {
          createdAt: latestScoreEvent.created_at,
          score: latestScoreEvent.score,
          segment: latestScoreEvent.segment,
          nextBestAction: latestScoreEvent.next_best_action,
          breakdown: mapBreakdown(latestScoreEvent.breakdown),
        }
      : null,
    aiInsight: isSellerAiInsight(aiInsight) ? aiInsight : null,
  };
};
