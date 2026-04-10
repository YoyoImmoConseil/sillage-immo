import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getAdminUserById, updateAdminUserProfile } from "@/services/admin/admin-user.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  firstName?: string;
  lastName?: string;
  title?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string | null;
  bookingUrl?: string;
};

export async function GET(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || context.role !== "administrateur" || !hasAdminPermission(context, "admin.users.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const user = await getAdminUserById(id);
    if (!user) {
      return NextResponse.json({ ok: false, message: "Utilisateur introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

  let body: PatchBody | null = null;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  try {
    await updateAdminUserProfile({
      profileId: id,
      actorProfileId: context.profile.id,
      firstName: body?.firstName,
      lastName: body?.lastName,
      title: body?.title,
      phone: body?.phone,
      bio: body?.bio,
      avatarUrl: body?.avatarUrl,
      bookingUrl: body?.bookingUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: 500 }
    );
  }
}
