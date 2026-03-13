import { NextResponse } from "next/server";
import { createBuyerLeadFromWebsite } from "@/services/buyers/buyer-lead.service";

type BuyerLeadInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  searchDetails?: string;
};

export const POST = async (request: Request) => {
  let body: BuyerLeadInput | null = null;
  try {
    body = (await request.json()) as BuyerLeadInput;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const fullName = body?.fullName?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const phone = body?.phone?.trim() ?? "";
  const searchDetails = body?.searchDetails?.trim() ?? "";

  if (!fullName || !email || !searchDetails) {
    return NextResponse.json(
      { ok: false, message: "Nom, email et recherche detaillee sont requis." },
      { status: 422 }
    );
  }

  try {
    const result = await createBuyerLeadFromWebsite({
      fullName,
      email,
      phone: phone || undefined,
      searchDetails,
    });

    return NextResponse.json({
      ok: true,
      leadId: result.lead.id,
      searchProfileId: result.searchProfile.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Impossible de creer le lead acquereur.",
      },
      { status: 500 }
    );
  }
};
