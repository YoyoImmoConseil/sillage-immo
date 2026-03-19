import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  listClients,
  createClientProfile,
  searchClients,
} from "@/services/clients/client-profile.service";

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") as "all" | "account_active" | "invite_pending" | "prospect" | undefined;
  const assignedAdminId = searchParams.get("assignedAdminId") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const q = searchParams.get("q"); // for search endpoint

  if (q !== null && q !== undefined) {
    try {
      const results = await searchClients(q, 10);
      return NextResponse.json({ ok: true, clients: results });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : "Recherche impossible." },
        { status: 500 }
      );
    }
  }

  try {
    const { items, total } = await listClients({
      search,
      status: status && status !== "all" ? status : undefined,
      assignedAdminId,
      limit,
      offset,
    });
    return NextResponse.json({ ok: true, clients: items, total });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Liste impossible." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.create")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  type CreateBody = { email?: string; phone?: string; firstName?: string; lastName?: string };
  let body: CreateBody = {};
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ ok: false, message: "Email requis." }, { status: 422 });
  }

  try {
    const result = await createClientProfile({
      email: body.email!,
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    if (result.status === "exists") {
      return NextResponse.json({
        ok: true,
        status: "exists",
        clientProfileId: result.clientProfileId,
      });
    }

    return NextResponse.json({
      ok: true,
      status: "created",
      clientProfileId: result.clientProfileId,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Creation impossible." },
      { status: 500 }
    );
  }
}
