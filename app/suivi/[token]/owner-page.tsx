import Link from "next/link";

import type { FollowupTokenPayload } from "@/lib/buyers/followup-token";
import { OWNER_CONFIRM_RESPONSES, isOwnerResponse, type OwnerResponse } from "@/lib/reactivation/model";
import { getReactivationContact, recordOwnerResponse } from "@/services/reactivation/reactivation-followup.service";
import { FOLLOWUP_INVALID_SCREEN, personalize, type FollowupScreen } from "./copy";
import { FollowupScreenView } from "./followup-screen";
import { OWNER_CONFIRM_SCREENS, OWNER_SCREENS } from "./owner-copy";

/**
 * Branche « réactivation propriétaires » de /suivi/<jeton> (campagnes `reac-*`).
 *
 * - vendre / valeur / garde / vendu_cherche : enregistrées à l'ouverture.
 * - vendu / stop : écran de confirmation d'abord, enregistrement au clic via
 *   /suivi/<jeton>/confirm, puis retour ici avec `done=1`.
 */
export async function OwnerFollowupPage(input: {
  token: string;
  payload: FollowupTokenPayload;
  response: string | undefined;
  done: boolean;
  /** `choose=1` : l'écran des quatre choix, sans rien enregistrer (retour arrière d'une confirmation). */
  choose: boolean;
  userAgent: string | null;
}) {
  if (!isOwnerResponse(input.response)) return renderInvalid();
  const contact = await getReactivationContact(input.payload.leadId);
  if (!contact) return renderInvalid();

  if (input.choose) return renderChoices(input.token, contact.firstName);

  if (OWNER_CONFIRM_RESPONSES.has(input.response) && !input.done) {
    return renderConfirm(input.token, input.response as "vendu" | "stop", contact.firstName);
  }
  if (!input.done) {
    await recordOwnerResponse({ payload: input.payload, response: input.response, userAgent: input.userAgent });
  }
  const screen = withBooking(OWNER_SCREENS[input.response]);
  return (
    <FollowupScreenView
      screen={screen}
      title={personalize(screen.title, contact.firstName)}
      body={personalize(screen.body, contact.firstName)}
    />
  );
}

const bookingUrl = () => process.env.REACTIVATION_BOOKING_URL?.trim() || null;

/** Remplace `{bookingUrl}` par la page de réservation, ou retire le bouton si elle n'est pas configurée. */
const withBooking = (screen: FollowupScreen): FollowupScreen => {
  const url = bookingUrl();
  if (!screen.primary || !screen.primary.href.includes("{bookingUrl}")) return screen;
  if (url) return { ...screen, primary: { ...screen.primary, href: url } };
  return {
    ...screen,
    primary: screen.secondary ? { ...screen.secondary, track: screen.primary.track } : undefined,
    secondary: undefined,
  };
};

const renderInvalid = () => (
  <FollowupScreenView screen={FOLLOWUP_INVALID_SCREEN} title={FOLLOWUP_INVALID_SCREEN.title} body={FOLLOWUP_INVALID_SCREEN.body} />
);

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-sand px-5 text-sm font-semibold text-navy transition hover:bg-sand/90";
const outlineClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-sand/60 px-5 text-sm font-semibold text-sand transition hover:bg-sand/10";

const renderConfirm = (token: string, response: "vendu" | "stop", firstName: string | null) => {
  const screen = OWNER_CONFIRM_SCREENS[response];
  const action = `/suivi/${encodeURIComponent(token)}/confirm`;
  return (
    <FollowupScreenView screen={screen} title={personalize(screen.title, firstName)} body={personalize(screen.body, firstName)}>
      <form method="post" action={action}>
        <input type="hidden" name="r" value={response} />
        <button type="submit" className={buttonClass} data-track-cta={`reactivation_${response}_confirm`} data-track-location="followup">
          {screen.confirm}
        </button>
      </form>
      {screen.alternate ? (
        <form method="post" action={action}>
          <input type="hidden" name="r" value={screen.alternate.response} />
          <button type="submit" className={buttonClass} data-track-cta={`reactivation_${screen.alternate.response}_confirm`} data-track-location="followup">
            {screen.alternate.label}
          </button>
        </form>
      ) : null}
      <Link
        href={`/suivi/${encodeURIComponent(token)}?r=${response}&choose=1`}
        className={outlineClass}
        data-track-cta={`reactivation_${response}_decline`}
        data-track-location="followup"
      >
        {screen.decline}
      </Link>
    </FollowupScreenView>
  );
};

const CHOICES: { response: OwnerResponse; label: string }[] = [
  { response: "vendre", label: "J'envisage de vendre, parlons-en" },
  { response: "valeur", label: "J'aimerais connaître sa valeur aujourd'hui" },
  { response: "vendu", label: "Je l'ai vendu" },
  { response: "garde", label: "Je le garde, pas de projet" },
];

/** Rien n'a été enregistré : les quatre choix du mail, à nouveau. */
const renderChoices = (token: string, firstName: string | null) => {
  const screen: FollowupScreen = {
    eyebrow: "Sillage Immo · Votre bien à Nice",
    title: "Où en êtes-vous aujourd'hui, {firstName} ?",
    body: "Rien n'a été enregistré. Un seul clic suffit, je n'ai pas besoin d'autre chose.",
  };
  return (
    <FollowupScreenView screen={screen} title={personalize(screen.title, firstName)} body={screen.body}>
      {CHOICES.map((choice, index) => (
        <Link
          key={choice.response}
          href={`/suivi/${encodeURIComponent(token)}?r=${choice.response}`}
          className={index === 0 ? buttonClass : outlineClass}
          data-track-cta={`reactivation_choose_${choice.response}`}
          data-track-location="followup"
        >
          {choice.label}
        </Link>
      ))}
    </FollowupScreenView>
  );
};
