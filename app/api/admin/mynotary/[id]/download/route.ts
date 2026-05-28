import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { getSignedDocumentByKey } from "@/services/admin/mynotary-list.service";
import { createArchiveDownloadUrl } from "@/services/mynotary/archive-signed-document.service";

export const dynamic = "force-dynamic";

// Admin download endpoint for MyNotary documents.
//
// Resolution order:
//   1. If we archived the PDF in Supabase Storage → mint a 5 min
//      signed URL and 302 to it.
//   2. Else, fall back to proxying the MyNotary file URL on the
//      server side: their CDN requires the `x-api-key` header that
//      a browser cannot send directly, so we have to stream the
//      bytes through our route. Per MyNotary (Q3 2026) these URLs
//      do **not** expire.
//
// Query string : ?kind=signed | proof  (defaults to signed)

const matchProofFile = (name: string | null | undefined): boolean => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes("preuve") ||
    lower.includes("proof") ||
    lower.includes("certificat") ||
    lower.includes("certificate") ||
    lower.includes("audit") ||
    lower.includes("eidas")
  );
};

const proxyFromMyNotary = async (
  fileUrl: string,
  fallbackName: string
): Promise<Response> => {
  const apiKey = process.env.MYNOTARY_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "mynotary_api_key_missing",
        message: "MYNOTARY_API_KEY non configurée sur le serveur.",
      },
      { status: 500 }
    );
  }
  const upstream = await fetch(fileUrl, {
    headers: { "x-api-key": apiKey },
  });
  if (!upstream.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "mynotary_upstream_error",
        status: upstream.status,
      },
      { status: 502 }
    );
  }
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") ?? "application/pdf"
  );
  const sanitized = fallbackName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  headers.set(
    "Content-Disposition",
    `inline; filename="${sanitized || "document.pdf"}"`
  );
  // Don't cache: tokens may rotate, and the document is sensitive.
  headers.set("Cache-Control", "private, no-store");
  return new Response(upstream.body, { status: 200, headers });
};

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

  // 1. Archive path takes priority.
  const archivedPath =
    kind === "proof" ? doc.signature_proof_path : doc.signed_document_path;
  if (archivedPath) {
    const signed = await createArchiveDownloadUrl(archivedPath, 300);
    if (signed) {
      return NextResponse.redirect(signed, 302);
    }
  }

  // 2. Fall back to streaming from MyNotary with the API key header.
  const files = doc.files ?? [];
  const proofFile = files.find((f) => matchProofFile(f.name));
  const signedFile =
    files.find((f) => !matchProofFile(f.name)) ?? files[0] ?? null;
  const file = kind === "proof" ? proofFile : signedFile;
  if (!file?.url) {
    return NextResponse.json(
      {
        ok: false,
        code: "archive_missing",
        message:
          kind === "proof"
            ? "Aucune preuve de signature disponible pour ce document."
            : "Aucun PDF disponible pour ce document.",
      },
      { status: 404 }
    );
  }

  return proxyFromMyNotary(
    file.url,
    file.name ? `${file.name}.pdf` : `mynotary_${doc.id}.pdf`
  );
};
