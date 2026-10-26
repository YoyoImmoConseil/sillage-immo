import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPublicAvailabilityStatus } from "@/lib/properties/canonical-types";
import { processBuyerAlerts } from "./buyer-alert.service";
import { recomputeMatchesForProperty, type RecomputeNewMatch } from "./buyer-matching.service";

export type ScheduledBuyerAlertsSummary = {
  listings: number;
  candidates: number;
  notifiedCount: number;
  skippedCount: number;
  errors: string[];
};

/**
 * Passage planifié (9 h / 12 h / 18 h) : recalcule les rapprochements de
 * chaque bien publié, rassemble toutes les correspondances jamais notifiées
 * qui atteignent le seuil, puis envoie — un seul mail par acquéreur,
 * regroupant ses nouveaux biens, quel que soit le nombre de biens.
 */
export const runScheduledBuyerAlerts = async (): Promise<ScheduledBuyerAlertsSummary> => {
  const { data: listings, error: listingsError } = await supabaseAdmin
    .from("property_listings")
    .select("id, property_id")
    .eq("is_published", true)
    .eq("publication_status", "active");
  if (listingsError) throw new Error(listingsError.message);

  const propertyIds = Array.from(new Set((listings ?? []).map((row) => row.property_id)));
  if (propertyIds.length === 0) {
    return { listings: 0, candidates: 0, notifiedCount: 0, skippedCount: 0, errors: [] };
  }
  const { data: properties, error: propertiesError } = await supabaseAdmin
    .from("properties")
    .select("id, availability_status")
    .in("id", propertyIds);
  if (propertiesError) throw new Error(propertiesError.message);
  const publicIds = (properties ?? [])
    .filter((row) => isPublicAvailabilityStatus(row.availability_status))
    .map((row) => row.id);

  const candidates: RecomputeNewMatch[] = [];
  const errors: string[] = [];
  for (const propertyId of publicIds) {
    try {
      const result = await recomputeMatchesForProperty(propertyId);
      candidates.push(...result.alertCandidates);
    } catch (error) {
      errors.push(`${propertyId}: ${error instanceof Error ? error.message : "recompute failed"}`);
    }
  }

  const sent = candidates.length > 0 ? await processBuyerAlerts(candidates) : { notifiedCount: 0, skippedCount: 0 };
  return { listings: publicIds.length, candidates: candidates.length, ...sent, errors };
};
