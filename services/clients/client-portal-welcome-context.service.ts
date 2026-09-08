import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PortalWelcomeContext } from "@/lib/client-space/portal-welcome-summary";
import { pickFirstName } from "@/lib/client-space/portal-welcome-summary";

/**
 * Contexte de personnalisation de l'email d'accès à l'Espace Sillage :
 * prénom du client et rappel de son projet (recherche active ou bien à
 * vendre). Tout est optionnel — en cas de doute ou d'erreur on renvoie un
 * contexte vide et l'email reste générique : l'envoi du lien ne doit jamais
 * échouer à cause de la personnalisation.
 */
export const getClientPortalWelcomeContext = async (
  email: string
): Promise<PortalWelcomeContext> => {
  const empty: PortalWelcomeContext = { firstName: null, search: null, seller: null };
  try {
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("id, first_name, full_name")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!profile) return empty;
    const firstName = pickFirstName({ firstName: profile.first_name, fullName: profile.full_name });

    const { data: projects } = await supabaseAdmin
      .from("client_projects")
      .select("id, project_type, status, created_at")
      .eq("client_profile_id", profile.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(10);

    const projectIds = (projects ?? []).map((project) => project.id);
    if (projectIds.length === 0) return { firstName, search: null, seller: null };

    // Recherche acquéreur active la plus récente.
    const { data: searchRow } = await supabaseAdmin
      .from("buyer_search_profiles")
      .select(
        "business_type, cities, property_types, budget_min, budget_max, rooms_min, bedrooms_min, living_area_min, status, created_at"
      )
      .in("client_project_id", projectIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (searchRow) {
      return {
        firstName,
        seller: null,
        search: {
          businessType: searchRow.business_type ?? null,
          cities: searchRow.cities ?? [],
          propertyTypes: searchRow.property_types ?? [],
          budgetMin: searchRow.budget_min ?? null,
          budgetMax: searchRow.budget_max ?? null,
          roomsMin: searchRow.rooms_min ?? null,
          bedroomsMin: searchRow.bedrooms_min ?? null,
          livingAreaMin: searchRow.living_area_min ?? null,
        },
      };
    }

    // Sinon, projet vendeur le plus récent avec son bien.
    const { data: sellerRow } = await supabaseAdmin
      .from("seller_projects")
      .select("seller_lead_id, created_at")
      .in("client_project_id", projectIds)
      .not("seller_lead_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sellerRow?.seller_lead_id) {
      const { data: lead } = await supabaseAdmin
        .from("seller_leads")
        .select("property_type, property_address, city, postal_code")
        .eq("id", sellerRow.seller_lead_id)
        .maybeSingle();
      if (lead) {
        return {
          firstName,
          search: null,
          seller: {
            propertyType: lead.property_type,
            propertyAddress: lead.property_address,
            city: lead.city,
            postalCode: lead.postal_code,
          },
        };
      }
    }

    return { firstName, search: null, seller: null };
  } catch (error) {
    console.warn(
      "[portal-welcome-context] fallback to generic email:",
      error instanceof Error ? error.message : error
    );
    return empty;
  }
};
