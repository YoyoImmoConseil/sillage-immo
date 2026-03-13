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
  if (!context || !hasAdminPermission(context, "admin.users.view")) {
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
  if (!context || !hasAdminPermission(context, "admin.users.manage")) {
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
      actorProfileId: context.profile?.id ?? null,
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
  if (!context || !hasAdminPermission(context, "admin.users.manage")) {
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
    if (body.role) {
      await updateAdminRole({
        profileId: body.profileId,
        role: body.role,
        actorProfileId: context.profile?.id ?? null,
      });
    }
    if (typeof body.isActive === "boolean") {
      await updateAdminUserStatus({
        profileId: body.profileId,
        isActive: body.isActive,
        actorProfileId: context.profile?.id ?? null,
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
