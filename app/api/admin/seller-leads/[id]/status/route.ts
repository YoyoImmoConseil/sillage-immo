import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = ["new", "to_call", "qualified", "closed"] as const;

const isAllowedStatus = (value: string): value is (typeof ALLOWED_STATUSES)[number] => {
  return ALLOWED_STATUSES.includes(value as (typeof ALLOWED_STATUSES)[number]);
};

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const PATCH = async (request: Request, { params }: RouteParams) => {
  const { id } = await params;
  let body: { status?: string } | null = null;

  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  if (!body?.status || !isAllowedStatus(body.status)) {
    return NextResponse.json(
      { ok: false, message: "Statut vendeur invalide." },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("seller_leads")
    .update({ status: body.status })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, message: "Lead vendeur introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
};
