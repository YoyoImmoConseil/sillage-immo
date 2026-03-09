import { NextResponse } from "next/server";
import { scoreSellerLead } from "@/services/sellers/seller-score.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const POST = async (_request: Request, { params }: RouteParams) => {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Identifiant de lead vendeur manquant." },
      { status: 422 }
    );
  }

  try {
    const result = await scoreSellerLead(id);
    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de scoring vendeur.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
