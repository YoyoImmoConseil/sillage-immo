import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { setBuyerSearchStatus } from "@/services/buyers/buyer-portal.service";

const bodySchema = z.object({
  status: z.enum(["active", "paused", "closed"]).optional(),
});

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export const POST = async (request: Request, context: RouteContext) => {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Authentification requise." }, { status: 401 });
  }

  const { projectId } = await context.params;
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Statut invalide." },
      { status: 422 }
    );
  }

  const nextStatus = parsed.data.status ?? "paused";

  try {
    const updated = await setBuyerSearchStatus({
      clientProfileId: session.clientProfile.id,
      clientProjectId: projectId,
      status: nextStatus,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "Recherche introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
