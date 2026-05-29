import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { goldenForSellerProject } from "@/services/admin/mynotary-match.service";

export const dynamic = "force-dynamic";

type Body = {
  documentId?: string;
  sellerProjectId?: string | null;
  propertyId?: string | null;
};

type SignedDocsWriter = {
  from: (table: "mynotary_signed_documents") => {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, value: string) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: {
              id: string;
              contract_kind: string;
              signed_at: string;
              mynotary_operation_id: string;
            } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

type SellerProjectsWriter = {
  from: (table: "seller_projects") => {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = async (request: Request) => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "admin.mynotary.manage")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Accès réservé aux managers / administrateurs." },
      { status: 403 }
    );
  }

  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "JSON invalide." },
      { status: 400 }
    );
  }

  if (!body?.documentId || !UUID_RE.test(body.documentId)) {
    return NextResponse.json(
      { ok: false, code: "invalid_document_id" },
      { status: 400 }
    );
  }
  const sellerProjectId = body.sellerProjectId?.trim() || null;
  const propertyId = body.propertyId?.trim() || null;
  if (!sellerProjectId && !propertyId) {
    return NextResponse.json(
      { ok: false, code: "missing_target", message: "Fournir un seller_project ou un property id." },
      { status: 400 }
    );
  }
  if (sellerProjectId && !UUID_RE.test(sellerProjectId)) {
    return NextResponse.json(
      { ok: false, code: "invalid_seller_project_id" },
      { status: 400 }
    );
  }
  if (propertyId && !UUID_RE.test(propertyId)) {
    return NextResponse.json(
      { ok: false, code: "invalid_property_id" },
      { status: 400 }
    );
  }

  const docsWriter = supabaseAdmin as unknown as SignedDocsWriter;
  const { data: updated, error } = await docsWriter
    .from("mynotary_signed_documents")
    .update({
      matched_seller_project_id: sellerProjectId,
      matched_property_id: propertyId,
      match_confidence: 1,
      match_method: "manual",
      match_attempted_at: new Date().toISOString(),
    })
    .eq("id", body.documentId)
    .select("id, contract_kind, signed_at, mynotary_operation_id")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { ok: false, code: "update_failed", message: error?.message ?? "row missing" },
      { status: 500 }
    );
  }

  if (
    updated.contract_kind === "mandate" &&
    sellerProjectId
  ) {
    const projectsWriter = supabaseAdmin as unknown as SellerProjectsWriter;
    await projectsWriter
      .from("seller_projects")
      .update({
        mandate_status: "signed",
        mandate_signed_at: updated.signed_at,
        mynotary_operation_id: updated.mynotary_operation_id,
      })
      .eq("id", sellerProjectId);
  }

  // Return the golden record for the now-linked dossier so the UI can show
  // divergences (step 2) without an extra round-trip.
  const resolved = sellerProjectId
    ? await goldenForSellerProject(sellerProjectId)
    : { golden: null, clientProfileId: null };

  return NextResponse.json({
    ok: true,
    sellerProjectId,
    clientProjectId: resolved.golden?.clientProjectId ?? null,
    clientProfileId: resolved.clientProfileId,
    golden: resolved.golden,
  });
};
