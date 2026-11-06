import Link from "next/link";
import { redirect } from "next/navigation";

import type { FollowupTokenPayload } from "@/lib/buyers/followup-token";
import {
  OWNER_CONFIRM_RESPONSES,
  OWNER_HOT_RESPONSES,
  isOwnerResponse,
  resolveSender,
  senderKeyForNegotiator,
  type OwnerResponse,
  type ReactivationSender,
} from "@/lib/reactivation/model";
import { getReactivationContact, recordOwnerResponse } from "@/services/reactivation/reactivation-followup.service";
import { FOLLOWUP_INVALID_SCREEN, personalize, type FollowupScreen } from "./copy";
import { FollowupScreenView } from "./followup-screen";
import { OWNER_CONFIRM_SCREENS, OWNER_SCREENS, withSender } from "./owner-copy";

/**
 * Branche « réactivation propriétaires » de /suivi/<jeton> (campagnes `reac-*`).
 *
 * - vendre / valeur : enregistrées à l'ouverture, puis le choix « être
 *   rappelé » / « réserver une visio » (+ « je cherche aussi à acheter »).
 * - rappel : enregistrée, mail au négociateur (c'est lui qui appelle).
 * - visio : enregistrée, mail au négociateur, puis redirection vers son
 *   planning Google Calendar (sans planning : écran d'attente).
 * - garde / cherche / vendu_cherche : enregistrées à l'ouverture.
 * - vendu / stop : écran de confirmation d'abord, enregistrement au clic via
 *   /suivi/<jeton>/confirm, puis retour ici avec `done=1`.
 * - `choose=1` : l'écran des quatre choix, sans rien enregistrer.
 * - `apercu=1` (liens des mails de test) : tout le parcours s'affiche, rien
 *   n'est enregistré, aucun mail ne part, pas de redirection ; un bandeau le dit.
 */
export async function OwnerFollowupPage(input: {
  token: string;
  payload: FollowupTokenPayload;
  response: string | undefined;
  done: boolean;
  choose: boolean;
  preview?: boolean;
  userAgent: string | null;
}) {
  if (!isOwnerResponse(input.response)) return renderInvalid();
  const contact = await getReactivationContact(input.payload.leadId);
  if (!contact) return renderInvalid();
  const sender = resolveSender(senderKeyForNegotiator(contact.negotiator));
  const preview = Boolean(input.preview);
  const q = preview ? "&apercu=1" : "";

  if (input.choose) return renderChoices(input.token, contact.firstName, q);

  if (OWNER_CONFIRM_RESPONSES.has(input.response) && !input.done) {
    return renderConfirm(input.token, input.response as "vendu" | "stop", contact.firstName, sender, preview);
  }
  if (!input.done && !preview) {
    await recordOwnerResponse({ payload: input.payload, response: input.response, userAgent: input.userAgent });
  }
  // Visio : la réponse est enregistrée et le négociateur prévenu, la personne
  // part réserver sur son planning. redirect() lève une exception Next.js
  // (pas d'instruction après) ; sans planning, l'écran d'attente ci-dessous.
  // En aperçu, pas de redirection : le lien du planning est affiché.
  if (input.response === "visio" && sender.bookingUrl && !preview) {
    redirect(sender.bookingUrl);
  }
  const screen = preview ? withPreviewBanner(OWNER_SCREENS[input.response]) : OWNER_SCREENS[input.response];
  const title = personalize(withSender(screen.title, sender.firstName), contact.firstName);
  const body = personalize(withSender(screen.body, sender.firstName), contact.firstName);

  if (OWNER_HOT_RESPONSES.has(input.response)) {
    return renderContactChoice(input.token, screen, title, body, sender, q);
  }
  if (input.response === "visio" && sender.bookingUrl && preview) {
    return (
      <FollowupScreenView screen={screen} title={title} body={body}>
        <a href={sender.bookingUrl} className={buttonClass} data-track-location="followup">
          Planning de {sender.firstName} (aperçu, pas de redirection)
        </a>
      </FollowupScreenView>
    );
  }
  if (input.response === "garde") {
    return (
      <FollowupScreenView screen={screen} title={title} body={body}>
        {screen.primary ? renderLink(screen.primary, buttonClass) : null}
        <Link
          href={`/suivi/${encodeURIComponent(input.token)}?r=cherche${q}`}
          className={outlineClass}
          data-track-cta="reactivation_garde_cherche"
          data-track-location="followup"
        >
          Je cherche un autre bien
        </Link>
      </FollowupScreenView>
    );
  }
  return <FollowupScreenView screen={screen} title={title} body={body} />;
}

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-sand px-5 text-sm font-semibold text-navy transition hover:bg-sand/90";
const outlineClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-sand/60 px-5 text-sm font-semibold text-sand transition hover:bg-sand/10";
const quietClass = "inline-flex min-h-11 items-center text-sm text-sand/80 underline underline-offset-4 hover:text-sand";

const renderLink = (link: { label: string; href: string; track?: string }, className: string) =>
  link.href.startsWith("/") ? (
    <Link href={link.href} className={className} data-track-cta={link.track} data-track-location="followup">
      {link.label}
    </Link>
  ) : (
    <a href={link.href} className={className} data-track-cta={link.track} data-track-location="followup">
      {link.label}
    </a>
  );

const PREVIEW_BANNER = "APERÇU — mail de test : rien n'est enregistré, aucun mail ne part. ";

const withPreviewBanner = <T extends FollowupScreen>(screen: T): T => ({ ...screen, eyebrow: `${PREVIEW_BANNER}${screen.eyebrow}` });

const renderInvalid = () => (
  <FollowupScreenView screen={FOLLOWUP_INVALID_SCREEN} title={FOLLOWUP_INVALID_SCREEN.title} body={FOLLOWUP_INVALID_SCREEN.body} />
);

/**
 * Après « je vends » / « sa valeur » : à égalité, être rappelé(e) par
 * téléphone (défaut) ou réserver une visio sur le planning du négociateur (si
 * elle ou il en a un) ; les deux passent par ?r=… pour être enregistrées et
 * prévenir le négociateur. En dessous, « je cherche aussi à acheter ».
 */
const renderContactChoice = (token: string, screen: FollowupScreen, title: string, body: string, sender: ReactivationSender, q = "") => (
  <FollowupScreenView screen={screen} title={title} body={body}>
    <Link
      href={`/suivi/${encodeURIComponent(token)}?r=rappel${q}`}
      className={buttonClass}
      data-track-cta="reactivation_choice_rappel"
      data-track-location="followup"
    >
      Je préfère que {sender.firstName} m&apos;appelle
    </Link>
    {sender.bookingUrl ? (
      <Link
        href={`/suivi/${encodeURIComponent(token)}?r=visio${q}`}
        className={outlineClass}
        data-track-cta="reactivation_choice_visio"
        data-track-location="followup"
      >
        Je réserve une visio avec {sender.firstName}
      </Link>
    ) : (
      <a href="tel:+33423450485" className={outlineClass} data-track-cta="reactivation_choice_call" data-track-location="followup">
        Appeler l&apos;agence
      </a>
    )}
    <Link
      href={`/suivi/${encodeURIComponent(token)}?r=cherche${q}`}
      className={quietClass}
      data-track-cta="reactivation_choice_cherche"
      data-track-location="followup"
    >
      Je cherche aussi à acheter
    </Link>
  </FollowupScreenView>
);

const renderConfirm = (token: string, response: "vendu" | "stop", firstName: string | null, sender: ReactivationSender, preview = false) => {
  const screen = preview ? withPreviewBanner(OWNER_CONFIRM_SCREENS[response]) : OWNER_CONFIRM_SCREENS[response];
  const action = `/suivi/${encodeURIComponent(token)}/confirm`;
  const q = preview ? "&apercu=1" : "";
  const previewField = preview ? <input type="hidden" name="apercu" value="1" /> : null;
  return (
    <FollowupScreenView
      screen={screen}
      title={personalize(withSender(screen.title, sender.firstName), firstName)}
      body={personalize(withSender(screen.body, sender.firstName), firstName)}
    >
      <form method="post" action={action}>
        <input type="hidden" name="r" value={response} />
        {previewField}
        <button type="submit" className={buttonClass} data-track-cta={`reactivation_${response}_confirm`} data-track-location="followup">
          {screen.confirm}
        </button>
      </form>
      {screen.alternate ? (
        <form method="post" action={action}>
          <input type="hidden" name="r" value={screen.alternate.response} />
          {previewField}
          <button type="submit" className={buttonClass} data-track-cta={`reactivation_${screen.alternate.response}_confirm`} data-track-location="followup">
            {screen.alternate.label}
          </button>
        </form>
      ) : null}
      <Link
        href={`/suivi/${encodeURIComponent(token)}?r=${response}&choose=1${q}`}
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
const renderChoices = (token: string, firstName: string | null, q = "") => {
  const screen: FollowupScreen = {
    eyebrow: `${q ? PREVIEW_BANNER : ""}Sillage Immo · Votre bien à Nice`,
    title: "Où en êtes-vous aujourd'hui, {firstName} ?",
    body: "Rien n'a été enregistré. Un seul clic suffit, nous n'avons pas besoin d'autre chose.",
  };
  return (
    <FollowupScreenView screen={screen} title={personalize(screen.title, firstName)} body={screen.body}>
      {CHOICES.map((choice, index) => (
        <Link
          key={choice.response}
          href={`/suivi/${encodeURIComponent(token)}?r=${choice.response}${q}`}
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
