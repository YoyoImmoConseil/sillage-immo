import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isClosingResponse, isFollowupResponse, type FollowupClosingResponse } from "@/lib/buyers/followup-token";
import { isReactivationCampaign } from "@/lib/reactivation/model";
import {
  buildFollowupPortalLink,
  getFollowupLead,
  recordFollowupResponse,
  verifyFollowupToken,
} from "@/services/buyers/buyer-followup.service";
import { FOLLOWUP_CONFIRM_SCREENS, FOLLOWUP_INVALID_SCREEN, FOLLOWUP_SCREENS, personalize } from "./copy";
import { FollowupScreenView } from "./followup-screen";
import { OwnerFollowupPage } from "./owner-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suivi de votre projet | Sillage Immo",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ r?: string | string[]; done?: string | string[]; choose?: string | string[]; apercu?: string | string[] }>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Page d'atterrissage des boutons de relance (/suivi/<jeton>?r=…).
 *
 * - actif / visio / modif : la réponse est enregistrée à l'ouverture, puis
 *   l'écran de confirmation s'affiche (modif : connexion automatique à
 *   l'espace client, sur la recherche en mode modification).
 * - conclu / abandon : écran de confirmation d'abord (un robot d'analyse de
 *   liens ne doit pas clore un projet), enregistrement au clic via
 *   /suivi/<jeton>/confirm, puis retour ici avec `done=1`.
 * - campagne `reac-*` : branche propriétaires (owner-page.tsx) — là, aucune
 *   réponse n'est enregistrée au GET : toutes passent par un bouton (POST
 *   /suivi/<jeton>/confirm), puis `done=1`.
 */
export default async function FollowupPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const query = await searchParams;
  const response = first(query.r);
  const done = first(query.done) === "1";

  const payload = verifyFollowupToken(token);
  if (!payload) return renderInvalid();

  // Campagnes `reac-*` : contact de réactivation SweepBright (propriétaires), pas un lead acquéreur.
  if (isReactivationCampaign(payload.campaign)) {
    return OwnerFollowupPage({
      token,
      payload,
      response,
      done,
      choose: first(query.choose) === "1",
      preview: first(query.apercu) === "1",
    });
  }

  if (!isFollowupResponse(response)) {
    return renderInvalid();
  }
  const lead = await getFollowupLead(payload.leadId);
  if (!lead) return renderInvalid();

  if (isClosingResponse(response) && !done) {
    return renderConfirm(token, response, lead.firstName);
  }

  let portalLink: string | null = null;
  if (!done) {
    const requestHeaders = await headers();
    await recordFollowupResponse({
      payload,
      response,
      userAgent: requestHeaders.get("user-agent"),
    });
    if (response === "modif") {
      const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
      const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
      portalLink = host
        ? await buildFollowupPortalLink({ payload, lead, origin: `${protocol}://${host}` })
        : null;
    }
  }
  if (portalLink) {
    redirect(portalLink);
  }

  const screen = FOLLOWUP_SCREENS[response];
  return (
    <FollowupScreenView
      screen={screen}
      title={personalize(screen.title, lead.firstName)}
      body={personalize(screen.body, lead.firstName)}
    />
  );
}

const renderInvalid = () => (
  <FollowupScreenView screen={FOLLOWUP_INVALID_SCREEN} title={FOLLOWUP_INVALID_SCREEN.title} body={FOLLOWUP_INVALID_SCREEN.body} />
);

const renderConfirm = (token: string, response: FollowupClosingResponse, firstName: string | null) => {
  const screen = FOLLOWUP_CONFIRM_SCREENS[response];
  return (
    <FollowupScreenView screen={screen} title={personalize(screen.title, firstName)} body={personalize(screen.body, firstName)}>
      <form method="post" action={`/suivi/${encodeURIComponent(token)}/confirm`}>
        <input type="hidden" name="r" value={response} />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-sand px-5 text-sm font-semibold text-navy transition hover:bg-sand/90"
          data-track-cta={`followup_${response}_confirm`}
          data-track-location="followup"
        >
          {screen.confirm}
        </button>
      </form>
      <Link
        href={`/suivi/${encodeURIComponent(token)}?r=actif`}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-sand/60 px-5 text-sm font-semibold text-sand transition hover:bg-sand/10"
        data-track-cta={`followup_${response}_decline`}
        data-track-location="followup"
      >
        {screen.decline}
      </Link>
    </FollowupScreenView>
  );
};
