import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  createAdminAuthorization,
  listAdminUsers,
  updateAdminRole,
  updateAdminUserStatus,
} from "@/services/admin/admin-user.service";
import type { AdminRole } from "@/types/domain/admin";

type CreateBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: AdminRole;
};

type PatchBody = {
  profileId?: string;
  role?: AdminRole;
  isActive?: boolean;
};

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || context.role !== "administrateur" || !hasAdminPermission(context, "admin.users.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Impossible de lister les admins." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext(request);
  if (
    !context ||
    !context.profile?.id ||
    context.role !== "administrateur" ||
    !hasAdminPermission(context, "admin.users.manage")
  ) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  let body: CreateBody | null = null;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body?.email?.trim() || !body.role) {
    return NextResponse.json({ ok: false, message: "Email et role sont requis." }, { status: 422 });
  }

  try {
    const created = await createAdminAuthorization({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
      actorProfileId: context.profile.id,
    });

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Creation impossible." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext(request);
  if (
    !context ||
    !context.profile?.id ||
    !context.profile?.email ||
    context.role !== "administrateur" ||
    !hasAdminPermission(context, "admin.users.manage")
  ) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  let body: PatchBody | null = null;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body?.profileId?.trim()) {
    return NextResponse.json({ ok: false, message: "profileId requis." }, { status: 422 });
  }

  try {
    const users = await listAdminUsers();
    const targetUser = users.find((user) => user.id === body.profileId);
    if (!targetUser) {
      return NextResponse.json({ ok: false, message: "Utilisateur introuvable." }, { status: 404 });
    }

    const isSelf =
      targetUser.id === context.profile.id ||
      targetUser.email.trim().toLowerCase() === context.profile.email.trim().toLowerCase();

    if (body.role) {
      if (isSelf && body.role !== "administrateur") {
        return NextResponse.json(
          { ok: false, message: "Vous ne pouvez pas modifier votre propre role." },
          { status: 409 }
        );
      }

      await updateAdminRole({
        profileId: body.profileId,
        role: body.role,
        actorProfileId: context.profile.id,
      });
    }
    if (typeof body.isActive === "boolean") {
      if (isSelf && body.isActive === false) {
        return NextResponse.json(
          { ok: false, message: "Vous ne pouvez pas suspendre votre propre acces." },
          { status: 409 }
        );
      }

      await updateAdminUserStatus({
        profileId: body.profileId,
        isActive: body.isActive,
        actorProfileId: context.profile.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: 500 }
    );
  }
}
