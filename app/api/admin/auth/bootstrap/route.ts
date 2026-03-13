import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { createAdminAuthorization, getAdminUserCount } from "@/services/admin/admin-user.service";

type BootstrapBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  bootstrapKey?: string;
};

export async function POST(request: Request) {
  let body: BootstrapBody | null = null;
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const currentCount = await getAdminUserCount();
  if (currentCount > 0) {
    return NextResponse.json(
      { ok: false, message: "Le bootstrap initial n'est plus disponible." },
      { status: 403 }
    );
  }

  if ((body?.bootstrapKey ?? "") !== serverEnv.ADMIN_API_KEY) {
    return NextResponse.json({ ok: false, message: "Cle de bootstrap invalide." }, { status: 401 });
  }

  const email = body?.email?.trim().toLowerCase() ?? "";
  const firstName = body?.firstName?.trim() ?? "";
  const lastName = body?.lastName?.trim() ?? "";

  if (!email || !firstName || !lastName) {
    return NextResponse.json(
      { ok: false, message: "Prenom, nom et email sont requis." },
      { status: 422 }
    );
  }

  try {
    await createAdminAuthorization({
      email,
      firstName,
      lastName,
      role: "administrateur",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Impossible de creer l'administrateur.",
      },
      { status: 500 }
    );
  }
}
