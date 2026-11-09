import Link from "next/link";
import { redirect } from "next/navigation";
import type { FollowupTokenPayload } from "@/lib/buyers/followup-token";
import {
  OWNER_HOT_RESPONSES,
  isOwnerResponse,
  resolveSender,
  senderKeyForNegotiator,
  type OwnerResponse,
  type ReactivationSender,
} from "@/lib/reactivation/model";
import { getReactivationContact } from "@/services/reactivation/reactivation-followup.service";
import { FOLLOWUP_INVALID_SCREEN, personalize, type FollowupScreen } from "./copy";
import { FollowupScreenView } from "./followup-screen";
import { OWNER_CONFIRM_SCREENS, OWNER_SCREENS, withSender } from "./owner-copy";

/**
 * Branche « réactivation propriétaires » de /suivi/<jeton> (campagnes `reac-*`).
 *
 * Règle (09/11/2026) : **rien n'est enregistré au chargement d'une page**. Les
 * scanners anti-hameçonnage des messageries ouvrent les liens des mails (et
 * suivent ceux des pages) ; un GET ne vaut donc pas une réponse. Toute réponse
 * passe par un bouton dans un formulaire POST vers /suivi/<jeton>/confirm,
 * qui enregistre puis revient ici avec `done=1`.
 *
 * - `?r=<réponse>` sans `done` : écran de confirmation, un seul bouton
 *   principal (POST), un lien discret pour revenir aux quatre choix.
 * - `?r=<réponse>&done=1` : la réponse vient d'être enregistrée ; écran de
 *   suite (choix appel / visio après vendre et valeur, redirection vers le
 *   planning après visio, « je cherche un autre bien » après garde…). Les
 *   boutons de ces écrans sont eux aussi des formulaires POST.
 * - `choose=1` : l'écran des quatre choix, sans rien enregistrer.
 * - `apercu=1` (liens des mails de test) : même parcours, rien n'est
 *   enregistré (le formulaire porte le champ `apercu`), aucun mail ne part,
 *   pas de redirection ; un bandeau le dit.
 */
export async function OwnerFollowupPage(input: {
  token: string;
  payload: FollowupTokenPayload;
  response: string | undefined;
  done: boolean;
  choose: boolean;
  preview?: boolean;
}) {
  if (!isOwnerResponse(input.response)) return renderInvalid();
  const contact = await getReactivationContact(input.payload.leadId);
  if (!contact) return renderInvalid();

  const sender = resolveSender(senderKeyForNegotiator(contact.negotiator));
  const preview = Boolean(input.preview);
  const q = preview ? "&apercu=1" : "";

  if (input.choose) return renderChoices(input.token, contact.firstName, q);

  // Pas encore enregistrée : confirmation d'abord, quelle que soit la réponse.
  if (!input.done) {
    return renderConfirm(input.token, input.response, contact.firstName, sender, preview);
  }

  // Visio : la réponse vient d'être enregistrée et le négociateur prévenu, la
  // personne part réserver sur son planning. redirect() lève une exception
  // Next.js (pas d'instruction après) ; sans planning, l'écran d'attente
  // ci-dessous. En aperçu, pas de redirection : le lien du planning est affiché.
  if (input.response === "visio" && sender.bookingUrl && !preview) {
    redirect(sender.bookingUrl);
  }

  const screen = preview ? withPreviewBanner(OWNER_SCREENS[input.response]) : OWNER_SCREENS[input.response];
  const title = personalize(withSender(screen.title, sender.firstName), contact.firstName);
  const body = personalize(withSender(screen.body, sender.firstName), contact.firstName);

  if (OWNER_HOT_RESPONSES.has(input.response)) {
    return renderContactChoice(input.token, screen, title, body, sender, preview);
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
        {renderPostButton(input.token, "cherche", "Je cherche un autre bien", outlineClass, "reactivation_garde_cherche", preview)}
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

const confirmAction = (token: string) => `/suivi/${encodeURIComponent(token)}/confirm`;

/**
 * Un bouton qui enregistre une réponse : formulaire POST vers /confirm (jamais
 * un lien GET, qu'un robot suivrait). En aperçu, le champ `apercu` est porté
 * pour que rien ne soit écrit.
 */
const renderPostButton = (token: string, response: OwnerResponse, label: string, className: string, track: string, preview: boolean) => (
  <form method="post" action={confirmAction(token)}>
    <input type="hidden" name="r" value={response} />
    {preview ? <input type="hidden" name="apercu" value="1" /> : null}
    <button type="submit" className={className} data-track-cta={track} data-track-location="followup">
      {label}
    </button>
  </form>
);

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
 * Après « je vends » / « sa valeur » (enregistrées) : à égalité, être
 * rappelé(e) par téléphone (défaut) ou réserver une visio sur le planning du
 * négociateur (si elle ou il en a un) ; en dessous, « je cherche aussi à
 * acheter ». Trois formulaires POST : chaque choix est enregistré au clic et
 * prévient le négociateur.
 */
const renderContactChoice = (token: string, screen: FollowupScreen, title: string, body: string, sender: ReactivationSender, preview: boolean) => (
  <FollowupScreenView screen={screen} title={title} body={body}>
    {renderPostButton(token, "rappel", `Je préfère que ${sender.firstName} m'appelle`, buttonClass, "reactivation_choice_rappel", preview)}
    {sender.bookingUrl ? (
      renderPostButton(token, "visio", `Je réserve une visio avec ${sender.firstName}`, outlineClass, "reactivation_choice_visio", preview)
    ) : (
      <a href="tel:+33423450485" className={outlineClass} data-track-cta="reactivation_choice_call" data-track-location="followup">
        Appeler l&apos;agence
      </a>
    )}
    {renderPostButton(token, "cherche", "Je cherche aussi à acheter", quietClass, "reactivation_choice_cherche", preview)}
  </FollowupScreenView>
);

/** Écran de confirmation : un bouton principal (POST), éventuellement un second choix, et le retour aux quatre choix. */
const renderConfirm = (token: string, response: OwnerResponse, firstName: string | null, sender: ReactivationSender, preview: boolean) => {
  const screen = preview ? withPreviewBanner(OWNER_CONFIRM_SCREENS[response]) : OWNER_CONFIRM_SCREENS[response];
  const q = preview ? "&apercu=1" : "";
  return (
    <FollowupScreenView
      screen={screen}
      title={personalize(withSender(screen.title, sender.firstName), firstName)}
      body={personalize(withSender(screen.body, sender.firstName), firstName)}
    >
      {renderPostButton(token, response, screen.confirm, buttonClass, `reactivation_${response}_confirm`, preview)}
      {screen.alternate
        ? renderPostButton(token, screen.alternate.response, screen.alternate.label, buttonClass, `reactivation_${screen.alternate.response}_confirm`, preview)
        : null}
      <Link
        href={`/suivi/${encodeURIComponent(token)}?r=${response}&choose=1${q}`}
        className={screen.alternate ? outlineClass : quietClass}
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

/** Rien n'a été enregistré : les quatre choix du mail, à nouveau (chacun mène à son écran de confirmation). */
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
