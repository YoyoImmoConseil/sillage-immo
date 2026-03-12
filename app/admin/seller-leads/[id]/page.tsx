import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import { SellerLeadStatusForm } from "./status-form";
import { SellerLeadScoreCard } from "./score-card";
import { PropertyDetailsForm } from "./property-details-form";
import { ValuationSyncCard } from "./valuation-sync-card";

const formatDate = (value: string) => {
  return new Date(value).toLocaleString("fr-FR");
};

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

type SellerLeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SellerLeadDetailPage({ params }: SellerLeadDetailPageProps) {
  const { id } = await params;
  const { data: leadData, error } = await supabaseAdmin
    .from("seller_leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: latestScoreEventData } = await supabaseAdmin
    .from("seller_scoring_events")
    .select("created_at, score, segment, next_best_action, breakdown")
    .eq("seller_lead_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestScoreEvent = latestScoreEventData as
    | Pick<
        Database["public"]["Tables"]["seller_scoring_events"]["Row"],
        "created_at" | "score" | "segment" | "next_best_action" | "breakdown"
      >
    | null;

  if (error) {
    return (
      <main className="min-h-screen bg-[#f4ece4] p-6 md:p-10 xl:p-14 2xl:p-20">
        <div className="w-full rounded-2xl border border-[rgba(20,20,70,0.22)] p-6">
          <h1 className="text-2xl font-semibold">Lead vendeur</h1>
          <p className="mt-3 text-sm text-red-700">
            Erreur de chargement: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const lead = leadData as Database["public"]["Tables"]["seller_leads"]["Row"] | null;
  if (!lead) notFound();

  const metadata =
    lead.metadata && typeof lead.metadata === "object"
      ? (lead.metadata as Record<string, unknown>)
      : {};
  const propertyDetails =
    metadata.property_details && typeof metadata.property_details === "object"
      ? (metadata.property_details as Record<string, unknown>)
      : {};
  const valuationData =
    metadata.valuation && typeof metadata.valuation === "object"
      ? (metadata.valuation as Record<string, unknown>)
      : null;
  const valuationNormalized =
    valuationData?.normalized && typeof valuationData.normalized === "object"
      ? (valuationData.normalized as Record<string, unknown>)
      : null;
  const scoringData =
    metadata.scoring && typeof metadata.scoring === "object"
      ? (metadata.scoring as Record<string, unknown>)
      : null;
  const aiInsightRaw =
    scoringData?.ai_insight && typeof scoringData.ai_insight === "object"
      ? (scoringData.ai_insight as Record<string, unknown>)
      : null;
  const propertyDetailsView = {
    elevator:
      typeof propertyDetails.elevator === "boolean"
        ? propertyDetails.elevator
          ? "Oui"
          : "Non"
        : "-",
    apartmentCondition:
      typeof propertyDetails.apartment_condition === "string"
        ? formatApartmentConditionLabel(propertyDetails.apartment_condition)
        : "-",
    buildingAge:
      typeof propertyDetails.building_age === "string"
        ? formatBuildingAgeLabel(propertyDetails.building_age)
        : "-",
    seaView:
      typeof propertyDetails.sea_view === "string"
        ? formatSeaViewLabel(propertyDetails.sea_view)
        : "-",
    buildingTotalFloors:
      typeof propertyDetails.building_total_floors === "number"
        ? String(propertyDetails.building_total_floors)
        : "-",
    isTopFloor:
      typeof propertyDetails.is_top_floor === "boolean"
        ? propertyDetails.is_top_floor
          ? "Oui"
          : "Non"
        : "-",
  };

  return (
    <main className="min-h-screen bg-[#f4ece4] p-6 md:p-10 xl:p-14 2xl:p-20">
      <div className="w-full space-y-6">
        <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-2">
          <div className="flex gap-2">
            <Link
              className="inline-block rounded border border-[#f4ece4] px-3 py-1 text-sm"
              href="/admin/seller-leads"
            >
              Retour a la liste
            </Link>
            <Link className="inline-block rounded border border-[#f4ece4] px-3 py-1 text-sm" href="/">
              Accueil
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{lead.full_name}</h1>
          <p className="text-sm text-[#f4ece4]/75">
            Cree le {formatDate(lead.created_at)} - {lead.email}
          </p>
        </section>

        <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6 space-y-4">
          <h2 className="sillage-section-title">Pilotage commercial</h2>
          <p className="text-sm opacity-70">
            Statut actuel: {formatStatusLabel(lead.status)}
          </p>
          <SellerLeadStatusForm sellerLeadId={lead.id} initialStatus={lead.status} />
        </section>

        <SellerLeadScoreCard
          sellerLeadId={lead.id}
          latestScore={
            latestScoreEvent
              ? {
                  createdAt: latestScoreEvent.created_at,
                  score: latestScoreEvent.score,
                  segment: latestScoreEvent.segment,
                  nextBestAction: latestScoreEvent.next_best_action,
                  breakdown: (() => {
                    const raw = (latestScoreEvent.breakdown as {
                      intent?: number;
                      asset?: number;
                      readiness?: number;
                      objection_detected?: boolean;
                      competitor_risk_detected?: boolean;
                      top_floor_bonus?: number;
                      sea_view_bonus?: number;
                    }) ?? null;
                    if (!raw) return null;
                    return {
                      intent: raw.intent ?? 0,
                      asset: raw.asset ?? 0,
                      readiness: raw.readiness ?? 0,
                      objectionDetected: raw.objection_detected ?? false,
                      competitorRiskDetected: raw.competitor_risk_detected ?? false,
                      topFloorBonus: raw.top_floor_bonus ?? 0,
                      seaViewBonus: raw.sea_view_bonus ?? 0,
                    };
                  })(),
                }
              : null
          }
          aiInsight={
            aiInsightRaw &&
            typeof aiInsightRaw.summary === "string" &&
            typeof aiInsightRaw.recommendedPitch === "string" &&
            typeof aiInsightRaw.nextAction === "string" &&
            typeof aiInsightRaw.generatedAt === "string" &&
            typeof aiInsightRaw.model === "string" &&
            (aiInsightRaw.competitorRiskLevel === "low" ||
              aiInsightRaw.competitorRiskLevel === "medium" ||
              aiInsightRaw.competitorRiskLevel === "high")
              ? {
                  summary: aiInsightRaw.summary,
                  competitorRiskLevel: aiInsightRaw.competitorRiskLevel,
                  recommendedPitch: aiInsightRaw.recommendedPitch,
                  nextAction: aiInsightRaw.nextAction,
                  generatedAt: aiInsightRaw.generatedAt,
                  model: aiInsightRaw.model,
                }
              : null
          }
        />

        <PropertyDetailsForm
          sellerLeadId={lead.id}
          initial={{
            livingArea:
              typeof propertyDetails.living_area === "number"
                ? propertyDetails.living_area
                : null,
            rooms: typeof propertyDetails.rooms === "number" ? propertyDetails.rooms : null,
            bedrooms:
              typeof propertyDetails.bedrooms === "number"
                ? propertyDetails.bedrooms
                : null,
            floor: typeof propertyDetails.floor === "string" ? propertyDetails.floor : null,
            buildingTotalFloors:
              typeof propertyDetails.building_total_floors === "number"
                ? propertyDetails.building_total_floors
                : null,
            isTopFloor:
              typeof propertyDetails.is_top_floor === "boolean"
                ? propertyDetails.is_top_floor
                : null,
            condition:
              typeof propertyDetails.condition === "string"
                ? propertyDetails.condition
                : null,
            elevator:
              typeof propertyDetails.elevator === "boolean"
                ? propertyDetails.elevator
                : null,
            apartmentCondition:
              typeof propertyDetails.apartment_condition === "string"
                ? propertyDetails.apartment_condition
                : null,
            buildingAge:
              typeof propertyDetails.building_age === "string"
                ? propertyDetails.building_age
                : null,
            seaView:
              typeof propertyDetails.sea_view === "string"
                ? propertyDetails.sea_view
                : null,
            valuationLow:
              typeof propertyDetails.valuation_low === "number"
                ? propertyDetails.valuation_low
                : null,
            valuationHigh:
              typeof propertyDetails.valuation_high === "number"
                ? propertyDetails.valuation_high
                : null,
            notes: typeof propertyDetails.notes === "string" ? propertyDetails.notes : null,
          }}
        />

        <ValuationSyncCard
          sellerLeadId={lead.id}
          valuation={
            valuationData
              ? {
                  provider:
                    typeof valuationData.provider === "string"
                      ? valuationData.provider
                      : null,
                  syncedAt:
                    typeof valuationData.synced_at === "string"
                      ? valuationData.synced_at
                      : null,
                  source:
                    typeof valuationData.source === "string" ? valuationData.source : null,
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
                    valuationNormalized &&
                    typeof valuationNormalized.valuationPrice === "number"
                      ? valuationNormalized.valuationPrice
                      : null,
                  valuationPriceLow:
                    valuationNormalized &&
                    typeof valuationNormalized.valuationPriceLow === "number"
                      ? valuationNormalized.valuationPriceLow
                      : null,
                  valuationPriceHigh:
                    valuationNormalized &&
                    typeof valuationNormalized.valuationPriceHigh === "number"
                      ? valuationNormalized.valuationPriceHigh
                      : null,
                }
              : null
          }
        />

        <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6">
          <h2 className="sillage-section-title">Informations vendeur</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="opacity-70">Telephone</dt>
              <dd>{lead.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Type de bien</dt>
              <dd>{lead.property_type ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Adresse</dt>
              <dd>{lead.property_address ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Ville</dt>
              <dd>
                {lead.city ?? "-"} {lead.postal_code ?? ""}
              </dd>
            </div>
            <div>
              <dt className="opacity-70">Delai de vente</dt>
              <dd>{formatTimelineLabel(lead.timeline)}</dd>
            </div>
            <div>
              <dt className="opacity-70">Occupation</dt>
              <dd>{formatOccupancyLabel(lead.occupancy_status)}</dd>
            </div>
            <div>
              <dt className="opacity-70">Ascenseur</dt>
              <dd>{propertyDetailsView.elevator}</dd>
            </div>
            <div>
              <dt className="opacity-70">Etat appartement</dt>
              <dd>{propertyDetailsView.apartmentCondition}</dd>
            </div>
            <div>
              <dt className="opacity-70">Age immeuble</dt>
              <dd>{propertyDetailsView.buildingAge}</dd>
            </div>
            <div>
              <dt className="opacity-70">Vue mer</dt>
              <dd>{propertyDetailsView.seaView}</dd>
            </div>
            <div>
              <dt className="opacity-70">Nombre d&apos;etages immeuble</dt>
              <dd>{propertyDetailsView.buildingTotalFloors}</dd>
            </div>
            <div>
              <dt className="opacity-70">Dernier etage</dt>
              <dd>{propertyDetailsView.isTopFloor}</dd>
            </div>
            <div>
              <dt className="opacity-70">Diagnostics prets</dt>
              <dd>{lead.diagnostics_ready === null ? "-" : lead.diagnostics_ready ? "Oui" : "Non"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Accompagnement diagnostics</dt>
              <dd>
                {lead.diagnostics_support_needed === null
                  ? "-"
                  : lead.diagnostics_support_needed
                    ? "Oui"
                    : "Non"}
              </dd>
            </div>
            <div>
              <dt className="opacity-70">Documents syndic prets</dt>
              <dd>{lead.syndic_docs_ready === null ? "-" : lead.syndic_docs_ready ? "Oui" : "Non"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Accompagnement syndic</dt>
              <dd>
                {lead.syndic_support_needed === null
                  ? "-"
                  : lead.syndic_support_needed
                    ? "Oui"
                    : "Non"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="opacity-70">Message</dt>
              <dd>{lead.message ?? "-"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
