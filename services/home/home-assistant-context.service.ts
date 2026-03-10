import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DAY_MS = 24 * 60 * 60 * 1000;

const getCount = async (table: "leads" | "seller_leads", sinceIso: string) => {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);

  if (error) return null;
  return count ?? 0;
};

export const getHomeAssistantContextSnapshot = async () => {
  const sinceIso = new Date(Date.now() - DAY_MS).toISOString();
  const [buyerLeads24h, sellerLeads24h] = await Promise.all([
    getCount("leads", sinceIso),
    getCount("seller_leads", sinceIso),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    market: "Nice / Cote d'Azur",
    ctaRoutes: {
      seller: "/estimation",
      buyer: "/#acquereur-form",
      market: "/#contact-expert",
    },
    leadActivity24h: {
      buyerLeads: buyerLeads24h,
      sellerLeads: sellerLeads24h,
    },
  };
};
