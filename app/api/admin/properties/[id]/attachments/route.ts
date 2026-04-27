import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  createSellerProjectFromPropertyWithCoOwners,
  type CoOwnerInput,
} from "@/services/clients/seller-project.service";

type AttachBody = {
  coOwners?: Array<
    | { clientProfileId: string }
    | {
        email?: string;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
      }
  >;
};

const sanitizeCoOwners = (input: AttachBody["coOwners"]): CoOwnerInput[] | string => {
  if (!Array.isArray(input) || input.length === 0) {
    return "Au moins un proprietaire est requis.";
  }
  const result: CoOwnerInput[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      return "Format proprietaire invalide.";
    }
    if ("clientProfileId" in entry && typeof entry.clientProfileId === "string" && entry.clientProfileId.trim()) {
      result.push({ clientProfileId: entry.clientProfileId.trim() });
      continue;
    }
    const email = "email" in entry && typeof entry.email === "string" ? entry.email.trim() : "";
    if (!email) {
      return "Chaque nouveau proprietaire doit avoir un email.";
    }
    result.push({
      email,
      firstName: "firstName" in entry && typeof entry.firstName === "string" ? entry.firstName.trim() : undefined,
      lastName: "lastName" in entry && typeof entry.lastName === "string" ? entry.lastName.trim() : undefined,
      phone: "phone" in entry && typeof entry.phone === "string" ? entry.phone.trim() : undefined,
    });
  }
  return result;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.create")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: propertyId } = await params;

  let body: AttachBody = {};
  try {
    body = (await request.json()) as AttachBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const coOwners = sanitizeCoOwners(body.coOwners);
  if (typeof coOwners === "string") {
    return NextResponse.json({ ok: false, message: coOwners }, { status: 422 });
  }

  try {
    const result = await createSellerProjectFromPropertyWithCoOwners({
      propertyId,
      coOwners,
      adminProfileId: context.profile?.id,
    });
    return NextResponse.json({
      ok: true,
      clientProjectId: result.clientProjectId,
      sellerProjectId: result.sellerProjectId,
      primaryClientProfileId: result.primaryClientProfileId,
      coOwnerClientProfileIds: result.coOwnerClientProfileIds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Rattachement du bien impossible.",
      },
      { status: 500 }
    );
  }
}
