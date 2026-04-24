import { NextResponse } from "next/server";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { markBuyerSearchMatchesRead } from "@/services/buyers/buyer-portal.service";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export const POST = async (_request: Request, context: RouteContext) => {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Authentification requise." }, { status: 401 });
  }

  const { projectId } = await context.params;

  try {
    const count = await markBuyerSearchMatchesRead({
      clientProfileId: session.clientProfile.id,
      clientProjectId: projectId,
    });
    return NextResponse.json({ ok: true, data: { markedCount: count } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "mark_read_failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
