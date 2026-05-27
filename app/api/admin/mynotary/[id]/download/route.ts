import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { getSignedDocumentByKey } from "@/services/admin/mynotary-list.service";
import { createArchiveDownloadUrl } from "@/services/mynotary/archive-signed-document.service";

export const dynamic = "force-dynamic";

// Mints a short-lived signed URL pointing at the archived PDF
// (signed document or eIDAS proof) for the admin UI.
//
// Query string : ?kind=signed | proof  (defaults to signed)
// Output       : 302 redirect to the signed Supabase Storage URL,
//                or 404 / 400 with a JSON error body.

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const context = await getAdminPageContext();
  if (!context) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated" },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "admin.mynotary.view")) {
    return NextResponse.json(
      { ok: false, code: "forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "proof" ? "proof" : "signed";

  const doc = await getSignedDocumentByKey({ id });
  if (!doc) {
    return NextResponse.json(
      { ok: false, code: "not_found" },
      { status: 404 }
    );
  }

  const path =
    kind === "proof" ? doc.signature_proof_path : doc.signed_document_path;
  if (!path) {
    return NextResponse.json(
      {
        ok: false,
        code: "archive_missing",
        message:
          kind === "proof"
            ? "Aucune preuve de signature archivée pour ce document."
            : "Aucun PDF archivé pour ce document.",
      },
      { status: 404 }
    );
  }

  const signed = await createArchiveDownloadUrl(path, 300);
  if (!signed) {
    return NextResponse.json(
      { ok: false, code: "signed_url_failed" },
      { status: 502 }
    );
  }

  return NextResponse.redirect(signed, 302);
};
