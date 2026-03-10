import { NextResponse } from "next/server";
import { createLead } from "@/services/leads/lead.service";

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

  const result = await createLead({
    fullName,
    email,
    phone: phone || undefined,
    message: searchDetails,
    source: "website_home_buyer_assistant",
  });

  if (result.status === "failed") {
    return NextResponse.json({ ok: false, message: result.reason }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    leadId: result.leadId,
    auditLogged: result.auditLogged,
  });
};
