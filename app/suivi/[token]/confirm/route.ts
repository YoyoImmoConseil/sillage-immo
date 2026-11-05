import { NextResponse } from "next/server";

import { isClosingResponse, isFollowupResponse } from "@/lib/buyers/followup-token";
import { OWNER_CONFIRM_RESPONSES, isOwnerResponse, isReactivationCampaign } from "@/lib/reactivation/model";
import { recordFollowupResponse, verifyFollowupToken } from "@/services/buyers/buyer-followup.service";
import { recordOwnerResponse } from "@/services/reactivation/reactivation-followup.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

/** Confirmation d'une réponse qui clôt le projet (formulaire de /suivi/<jeton>). */
export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const form = await request.formData().catch(() => null);
  const response = form?.get("r");
  const payload = verifyFollowupToken(token);
  const back = new URL(`/suivi/${encodeURIComponent(token)}`, request.url);
  if (!payload) return NextResponse.redirect(back, 303);

  // Réactivation propriétaires : vendu / vendu_cherche / stop passent par ici.
  if (isReactivationCampaign(payload.campaign)) {
    const confirmable = isOwnerResponse(response) && (OWNER_CONFIRM_RESPONSES.has(response) || response === "vendu_cherche");
    if (!confirmable) return NextResponse.redirect(back, 303);
    try {
      await recordOwnerResponse({ payload, response, userAgent: request.headers.get("user-agent") });
    } catch (error) {
      console.error("[suivi/confirm] owner record failed:", error instanceof Error ? error.message : error);
      return NextResponse.redirect(back, 303);
    }
    back.searchParams.set("r", response);
    back.searchParams.set("done", "1");
    return NextResponse.redirect(back, 303);
  }

  if (!isFollowupResponse(response) || !isClosingResponse(response)) {
    return NextResponse.redirect(back, 303);
  }
  try {
    await recordFollowupResponse({ payload, response, userAgent: request.headers.get("user-agent") });
  } catch (error) {
    console.error("[suivi/confirm] record failed:", error instanceof Error ? error.message : error);
    return NextResponse.redirect(back, 303);
  }
  back.searchParams.set("r", response);
  back.searchParams.set("done", "1");
  return NextResponse.redirect(back, 303);
}
