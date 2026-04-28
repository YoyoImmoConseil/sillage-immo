import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getAdminUserById } from "@/services/admin/admin-user.service";
import {
  ADMIN_AVATAR_ALLOWED_MIME,
  ADMIN_AVATAR_MAX_BYTES,
  createSignedUploadUrlForAdminAvatar,
} from "@/services/admin/admin-user-avatar.service";

type RouteParams = { params: Promise<{ id: string }> };

type Body = {
  fileName?: string;
  sizeBytes?: number;
  mimeType?: string;
};

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (
    !context ||
    !context.profile?.id ||
    context.role !== "administrateur" ||
    !hasAdminPermission(context, "admin.users.manage")
  ) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id } = await params;

  const currentUser = await getAdminUserById(id);
  if (!currentUser) {
    return NextResponse.json(
      { ok: false, message: "Utilisateur introuvable." },
      { status: 404 }
    );
  }

  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const fileName = (body?.fileName ?? "").trim();
  const sizeBytes = typeof body?.sizeBytes === "number" ? body.sizeBytes : NaN;
  const mimeType = (body?.mimeType ?? "").trim();

  if (!fileName) {
    return NextResponse.json(
      { ok: false, message: "Nom de fichier requis." },
      { status: 422 }
    );
  }
  if (!(ADMIN_AVATAR_ALLOWED_MIME as readonly string[]).includes(mimeType)) {
    return NextResponse.json(
      { ok: false, message: "Format image non supporte." },
      { status: 422 }
    );
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json(
      { ok: false, message: "Taille de fichier invalide." },
      { status: 422 }
    );
  }
  if (sizeBytes > ADMIN_AVATAR_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Image trop lourde (5 Mo max)." },
      { status: 413 }
    );
  }

  try {
    const signed = await createSignedUploadUrlForAdminAvatar({
      profileId: id,
      fileName,
      sizeBytes,
      mimeType,
    });
    return NextResponse.json({ ok: true, ...signed });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "URL d'upload indisponible.",
      },
      { status: 500 }
    );
  }
}
