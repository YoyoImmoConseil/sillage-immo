import type { OwnerResponse } from "@/lib/reactivation/model";
import type { FollowupScreen } from "./copy";

const EYEBROW = "Sillage Immo · Votre bien à Nice";

/**
 * Écrans de la réactivation propriétaires (/suivi/<jeton>?r=…).
 * `{firstName}` et `{sender}` (prénom du négociateur signataire) sont remplacés.
 * Sur vendre / valeur, l'écran propose à égalité « être rappelé » (appel
 * téléphonique, mail au négociateur) et « réserver une visio » (planning
 * Google Calendar du négociateur — un planning ne sait proposer qu'un type de
 * rendez-vous, d'où le choix ici, décision du 06/11) ; la visio n'apparaît que
 * si le négociateur a une page.
 */
export const OWNER_SCREENS: Record<OwnerResponse, FollowupScreen> = {
  vendre: {
    eyebrow: EYEBROW,
    title: "Merci {firstName}, parlons-en.",
    body: "Votre réponse est enregistrée. Comment préférez-vous que nous nous parlions ? {sender} peut vous appeler dans la journée, ou vous choisissez vous-même un créneau de 15 minutes en visio.",
  },
  valeur: {
    eyebrow: EYEBROW,
    title: "Merci {firstName}, {sender} prépare votre avis de valeur.",
    body: "Quelques précisions sont nécessaires (surface, étage, travaux récents), puis vous recevez un avis argumenté : ventes comparables du quartier, annonces en cours, raisonnement. Comment préférez-vous que nous nous parlions ?",
  },
  rappel: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName}.",
    body: "{sender} vous appelle dans la journée, au numéro que nous avons pour vous. Si ce numéro a changé, un simple e-mail suffit.",
    primary: { label: "Voir les prix de mon quartier", href: "/quartiers", track: "reactivation_rappel_quartiers" },
    secondary: { label: "Retour à l'accueil", href: "/" },
  },
  // Affiché seulement si le négociateur n'a pas de planning (sinon redirection directe).
  visio: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName}.",
    body: "{sender} vous écrit dans la journée pour convenir d'un créneau de visio. Si vous préférez un appel, répondez simplement à son message.",
    primary: { label: "Voir les prix de mon quartier", href: "/quartiers", track: "reactivation_visio_quartiers" },
    secondary: { label: "Retour à l'accueil", href: "/" },
  },
  cherche: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName} : vous cherchez aussi.",
    body: "{sender} vous rappelle pour comprendre ce que vous cherchez (secteur, budget, type de bien) et vous ouvrir un espace Sillage avec vos critères. Vous recevrez ensuite les biens qui correspondent, et uniquement ceux-là.",
    primary: { label: "Voir les biens à vendre", href: "/vente", track: "reactivation_cherche_vente" },
    secondary: { label: "Retour à l'accueil", href: "/" },
  },
  vendu: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName}.",
    body: "Votre dossier est à jour et je ne vous écrirai plus à ce sujet. Si un jour vous avez un nouveau bien à vendre ou à faire estimer, mes coordonnées restent les mêmes.",
    primary: { label: "Retour à l'accueil", href: "/", track: "reactivation_vendu_home" },
    secondary: { label: "Voir les biens à vendre", href: "/vente" },
  },
  vendu_cherche: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName} : vous cherchez.",
    body: "{sender} vous recontacte dans la journée pour comprendre ce que vous cherchez (secteur, budget, type de bien) et vous ouvrir un espace Sillage avec vos critères. Vous recevrez ensuite les biens qui correspondent, et uniquement ceux-là.",
    primary: { label: "Voir les biens à vendre", href: "/vente", track: "reactivation_cherche_vente" },
    secondary: { label: "Appeler l'agence", href: "tel:+33423450485" },
  },
  garde: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName}.",
    body: "Vous gardez votre bien, {sender} garde votre dossier au calme : plus de relance, un simple point dans six mois, et les prix de votre quartier restent consultables à tout moment. Si vous cherchez un autre bien, dites-le-nous ici.",
    primary: { label: "Voir les prix de mon quartier", href: "/quartiers", track: "reactivation_garde_quartiers" },
    secondary: { label: "Retour à l'accueil", href: "/" },
  },
  stop: {
    eyebrow: EYEBROW,
    title: "C'est fait, {firstName}.",
    body: "Vous ne recevrez plus de message de notre part. Si vous changez d'avis un jour, un e-mail ou un appel suffira.",
    primary: { label: "Retour à l'accueil", href: "/", track: "reactivation_stop_home" },
  },
};

/**
 * Écrans de confirmation : depuis le 09/11/2026, **toute** réponse est confirmée
 * par un bouton (formulaire POST) avant d'être enregistrée — les scanners
 * anti-hameçonnage des messageries ouvrent les liens des mails, un simple GET
 * ne vaut donc pas une réponse. Textes courts, vouvoiement ; `{firstName}` et
 * `{sender}` sont remplacés. `decline` ramène aux quatre choix.
 */
export type OwnerConfirmScreen = FollowupScreen & { confirm: string; decline: string; alternate?: { label: string; response: OwnerResponse } };

const DECLINE = "Non, je me suis trompé(e)";

export const OWNER_CONFIRM_SCREENS: Record<OwnerResponse, OwnerConfirmScreen> = {
  vendre: {
    eyebrow: EYEBROW,
    title: "Vous envisagez de vendre, {firstName} ?",
    body: "Confirmez d'un clic : {sender} vous recontacte dans la journée. Rien ne part avant.",
    confirm: "Oui, parlons-en",
    decline: DECLINE,
  },
  valeur: {
    eyebrow: EYEBROW,
    title: "Vous souhaitez connaître la valeur de votre bien aujourd'hui ?",
    body: "Confirmez d'un clic : {sender} prépare votre avis de valeur et vous recontacte dans la journée.",
    confirm: "Oui, je veux une estimation",
    decline: DECLINE,
  },
  garde: {
    eyebrow: EYEBROW,
    title: "Vous gardez votre bien, sans projet pour l'instant ?",
    body: "Confirmez d'un clic : plus de relance, votre dossier reste au calme.",
    confirm: "Oui, je le garde",
    decline: DECLINE,
  },
  cherche: {
    eyebrow: EYEBROW,
    title: "Vous cherchez un bien à acheter ?",
    body: "Confirmez d'un clic : {sender} vous rappelle pour comprendre ce que vous cherchez.",
    confirm: "Oui, je cherche",
    decline: DECLINE,
  },
  vendu_cherche: {
    eyebrow: EYEBROW,
    title: "Vous cherchez un bien à acheter ?",
    body: "Confirmez d'un clic : votre dossier est mis à jour et {sender} vous rappelle pour comprendre ce que vous cherchez.",
    confirm: "Oui, je cherche",
    decline: DECLINE,
  },
  rappel: {
    eyebrow: EYEBROW,
    title: "{sender} vous rappelle dans la journée ?",
    body: "Confirmez d'un clic : {sender} vous appelle au numéro que nous avons pour vous.",
    confirm: "Oui, qu'on m'appelle",
    decline: DECLINE,
  },
  visio: {
    eyebrow: EYEBROW,
    title: "Réserver une visio avec {sender} ?",
    body: "Confirmez d'un clic : vous choisissez ensuite un créneau de 15 minutes sur le planning de {sender}.",
    confirm: "Oui, je choisis un créneau",
    decline: DECLINE,
  },
  vendu: {
    eyebrow: EYEBROW,
    title: "Vous avez vendu, {firstName} ?",
    body: "Confirmez et votre dossier est mis à jour. Une question avant : cherchez-vous un autre bien à Nice ? Si oui, dites-le-nous, c'est le seul cas où {sender} vous recontacte.",
    confirm: "Oui, j'ai vendu",
    alternate: { label: "Oui, et je cherche un autre bien", response: "vendu_cherche" },
    decline: "Non, je n'ai pas vendu",
  },
  stop: {
    eyebrow: EYEBROW,
    title: "Ne plus recevoir de messages ?",
    body: "Confirmez et votre adresse est retirée de nos envois. Si c'est une erreur, revenez simplement en arrière.",
    confirm: "Oui, ne plus m'écrire",
    decline: "Non, gardez mon dossier",
  },
};

/** Remplace `{sender}` par le prénom du négociateur signataire. */
export const withSender = (text: string, senderFirstName: string) => text.replaceAll("{sender}", senderFirstName);
