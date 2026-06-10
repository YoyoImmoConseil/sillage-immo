import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { generateSellerAiInsight } from "@/services/sellers/seller-ai-insight.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const POST = async (request: Request, { params }: RouteParams) => {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "leads.sellers.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Identifiant de lead vendeur manquant." },
      { status: 422 }
    );
  }

  try {
    const insight = await generateSellerAiInsight(id);
    return NextResponse.json({ ok: true, data: insight });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur analyse IA lead vendeur.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
