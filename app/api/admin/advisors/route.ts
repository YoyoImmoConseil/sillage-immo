import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseAdminProfileMetadata } from "@/services/admin/admin-profile-metadata";

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.assign_advisor")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, first_name, last_name, full_name, email, metadata")
    .eq("is_active", true)
    .order("last_name");
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    advisors: (data ?? []).map((advisor) => {
      const metadata = parseAdminProfileMetadata(advisor.metadata);
      return {
        id: advisor.id,
        first_name: advisor.first_name,
        last_name: advisor.last_name,
        full_name: advisor.full_name,
        email: advisor.email,
        phone: metadata.phone,
        bookingUrl: metadata.bookingUrl,
      };
    }),
  });
}
