import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getAdminUserById, updateAdminUserProfile } from "@/services/admin/admin-user.service";
import { uploadAdminUserAvatar } from "@/services/admin/admin-user-avatar.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

  try {
    const currentUser = await getAdminUserById(id);
    if (!currentUser) {
      return NextResponse.json({ ok: false, message: "Utilisateur introuvable." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Fichier manquant." }, { status: 422 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, message: "Format image non supporte." }, { status: 422 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "Image trop lourde (5 Mo max)." }, { status: 422 });
    }

    const avatarUrl = await uploadAdminUserAvatar({
      profileId: id,
      file,
      previousAvatarUrl: currentUser.avatarUrl,
    });

    await updateAdminUserProfile({
      profileId: id,
      actorProfileId: context.profile.id,
      firstName: currentUser.firstName ?? undefined,
      lastName: currentUser.lastName ?? undefined,
      title: currentUser.title ?? undefined,
      phone: currentUser.phone ?? undefined,
      bio: currentUser.bio ?? undefined,
      avatarUrl,
    });

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Upload impossible." },
      { status: 500 }
    );
  }
}
