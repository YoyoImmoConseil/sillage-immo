import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  setGoldenOverride,
  computePropertyGoldenRecord,
  type GoldenOverrideField,
} from "@/services/properties/golden-record.service";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS: GoldenOverrideField[] = [
  "address",
  "price",
  "livingArea",
  "propertyType",
  "rooms",
  "floor",
  "seller.fullName",
  "seller.email",
  "seller.phone",
];

type Body = {
  field?: string;
  value?: unknown;
  clientProjectId?: string;
};

export const PUT = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Permission insuffisante." },
      { status: 403 }
    );
  }

  const { id: sellerProjectId } = await params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "JSON invalide." },
      { status: 400 }
    );
  }

  const field = body.field as GoldenOverrideField | undefined;
  if (!field || !ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json(
      { ok: false, code: "invalid_field", message: "Champ d'override invalide." },
      { status: 400 }
    );
  }

  try {
    await setGoldenOverride({
      sellerProjectId,
      field,
      value: body.value ?? null,
      adminProfileId: context.profile.id,
    });
    const golden = body.clientProjectId
      ? await computePropertyGoldenRecord(body.clientProjectId)
      : null;
    return NextResponse.json({ ok: true, golden });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "update_failed",
        message: err instanceof Error ? err.message : "Échec de la mise à jour.",
      },
      { status: 400 }
    );
  }
};
