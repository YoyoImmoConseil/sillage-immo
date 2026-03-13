import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { generateSellerAiInsight } from "@/services/sellers/seller-ai-insight.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const POST = async (request: Request, { params }: RouteParams) => {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
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
