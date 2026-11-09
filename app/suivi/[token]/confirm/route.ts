import { NextResponse } from "next/server";
import { isClosingResponse, isFollowupResponse } from "@/lib/buyers/followup-token";
import { isOwnerResponse, isReactivationCampaign } from "@/lib/reactivation/model";
import { recordFollowupResponse, verifyFollowupToken } from "@/services/buyers/buyer-followup.service";
import { recordOwnerResponse } from "@/services/reactivation/reactivation-followup.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Enregistrement d'une réponse au clic sur un bouton de /suivi/<jeton>
 * (formulaire POST, champ `r`). Un GET n'enregistre jamais rien : les scanners
 * anti-hameçonnage des messageries ouvrent les liens des mails.
 *
 * - Réactivation propriétaires (campagnes `reac-*`) : toutes les réponses
 *   passent par ici ; `apercu=1` (mails de test) affiche la suite sans rien
 *   écrire. Retour sur /suivi/<jeton>?r=<réponse>&done=1.
 * - Relance acquéreurs : les réponses qui clôturent le projet (conclu / abandon).
 */
export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const form = await request.formData().catch(() => null);
  const response = form?.get("r");
  const payload = verifyFollowupToken(token);
  const back = new URL(`/suivi/${encodeURIComponent(token)}`, request.url);
  if (!payload) return NextResponse.redirect(back, 303);

  if (isReactivationCampaign(payload.campaign)) {
    if (!isOwnerResponse(response)) return NextResponse.redirect(back, 303);
    const preview = form?.get("apercu") === "1";
    if (!preview) {
      try {
        await recordOwnerResponse({ payload, response, userAgent: request.headers.get("user-agent") });
      } catch (error) {
        console.error("[suivi/confirm] owner record failed:", error instanceof Error ? error.message : error);
        return NextResponse.redirect(back, 303);
      }
    }
    back.searchParams.set("r", response);
    back.searchParams.set("done", "1");
    if (preview) back.searchParams.set("apercu", "1");
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
