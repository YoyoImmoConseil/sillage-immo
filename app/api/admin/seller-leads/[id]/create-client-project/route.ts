import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { createSellerProjectFromLead } from "@/services/clients/seller-project.service";

type RouteParams = { params: Promise<{ id: string }> };

type SellerProjectRow = { id: string; client_project_id: string };

async function findSellerProjectByLeadId(sellerLeadId: string): Promise<SellerProjectRow | null> {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { data } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id")
    .eq("seller_lead_id", sellerLeadId)
    .maybeSingle();
  return data as SellerProjectRow | null;
}

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.create")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: sellerLeadId } = await params;

  const existing = await findSellerProjectByLeadId(sellerLeadId);
  if (existing) {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data: cp } = await supabaseAdmin
      .from("client_projects")
      .select("client_profile_id")
      .eq("id", existing.client_project_id)
      .single();
    const cpRow = cp as { client_profile_id: string } | null;
    return NextResponse.json({
      ok: true,
      status: "exists",
      clientProjectId: existing.client_project_id,
      sellerProjectId: existing.id,
      clientProfileId: cpRow?.client_profile_id,
    });
  }

  try {
    const result = await createSellerProjectFromLead({
      sellerLeadId,
      adminProfileId: context.profile?.id,
    });
    return NextResponse.json({
      ok: true,
      status: "created",
      clientProjectId: result.clientProjectId,
      sellerProjectId: result.sellerProjectId,
      clientProfileId: result.clientProfileId,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Creation impossible." },
      { status: 500 }
    );
  }
}
