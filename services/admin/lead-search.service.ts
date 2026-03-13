import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

type SellerLeadRow = Database["public"]["Tables"]["seller_leads"]["Row"];

export type SellerLeadListItem = Pick<
  SellerLeadRow,
  "id" | "created_at" | "full_name" | "email" | "phone" | "city" | "timeline" | "status" | "property_type"
>;

export const searchSellerLeads = async (input: {
  search?: string;
  status?: string;
  city?: string;
}) => {
  let query = supabaseAdmin
    .from("seller_leads")
    .select("id, created_at, full_name, email, phone, city, timeline, status, property_type")
    .order("created_at", { ascending: false })
    .limit(150);

  if (input.search?.trim()) {
    const term = input.search.trim();
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,property_address.ilike.%${term}%,message.ilike.%${term}%`
    );
  }
  if (input.status?.trim()) {
    query = query.eq("status", input.status.trim());
  }
  if (input.city?.trim()) {
    query = query.ilike("city", `%${input.city.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SellerLeadListItem[]).map((item) => item);
};
