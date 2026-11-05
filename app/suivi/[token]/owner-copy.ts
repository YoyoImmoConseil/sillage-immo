import type { OwnerResponse } from "@/lib/reactivation/model";
import type { FollowupScreen } from "./copy";

const EYEBROW = "Sillage Immo · Votre bien à Nice";

/**
 * Écrans de la réactivation propriétaires (/suivi/<jeton>?r=vendre|valeur|vendu|garde|stop).
 * `{firstName}` est remplacé ; `{bookingUrl}` n'est utilisé que si une page de
 * réservation est configurée (REACTIVATION_BOOKING_URL).
 */
export const OWNER_SCREENS: Record<OwnerResponse, FollowupScreen> = {
  vendre: {
    eyebrow: EYEBROW,
    title: "Merci {firstName}, parlons-en.",
    body: "Votre réponse est enregistrée : je vous appelle dans la journée pour comprendre votre projet et son calendrier. Si vous préférez choisir le moment, réservez directement un créneau de 15 minutes.",
    primary: { label: "Réserver 15 minutes avec Yoann", href: "{bookingUrl}", track: "reactivation_vendre_booking" },
    secondary: { label: "Appeler l'agence", href: "tel:+33423450485" },
  },
  valeur: {
    eyebrow: EYEBROW,
    title: "Merci {firstName}, je prépare votre avis de valeur.",
    body: "Je vous recontacte dans la journée pour les quelques précisions dont j'ai besoin (surface, étage, travaux récents), puis vous recevez un avis argumenté : ventes comparables du quartier, annonces en cours, raisonnement. Vous repartez avec le raisonnement, pas seulement le chiffre.",
    primary: { label: "Réserver 15 minutes avec Yoann", href: "{bookingUrl}", track: "reactivation_valeur_booking" },
    secondary: { label: "Voir les prix de mon quartier", href: "/quartiers" },
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
    body: "Je vous recontacte dans la journée pour comprendre ce que vous cherchez (secteur, budget, type de bien) et vous ouvrir un espace Sillage avec vos critères. Vous recevrez ensuite les biens qui correspondent, et uniquement ceux-là.",
    primary: { label: "Voir les biens à vendre", href: "/vente", track: "reactivation_cherche_vente" },
    secondary: { label: "Appeler l'agence", href: "tel:+33423450485" },
  },
  garde: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName}.",
    body: "Vous gardez votre bien, je garde votre dossier au calme. Je ne vous relancerai pas ; je reprendrai simplement contact dans six mois, et les prix de votre quartier restent consultables à tout moment.",
    primary: { label: "Voir les prix de mon quartier", href: "/quartiers", track: "reactivation_garde_quartiers" },
    secondary: { label: "Retour à l'accueil", href: "/" },
  },
  stop: {
    eyebrow: EYEBROW,
    title: "C'est fait, {firstName}.",
    body: "Vous ne recevrez plus de message de ma part. Si vous changez d'avis un jour, un e-mail ou un appel suffira.",
    primary: { label: "Retour à l'accueil", href: "/", track: "reactivation_stop_home" },
  },
};

/** Confirmation avant d'enregistrer une réponse qui clôt le dossier (protège des robots qui suivent les liens). */
export const OWNER_CONFIRM_SCREENS: Record<"vendu" | "stop", FollowupScreen & { confirm: string; decline: string; alternate?: { label: string; response: OwnerResponse } }> = {
  vendu: {
    eyebrow: EYEBROW,
    title: "Vous avez vendu, {firstName} ?",
    body: "Confirmez et je mets votre dossier à jour. Une question avant : cherchez-vous un autre bien à Nice ? Si oui, dites-le-moi, c'est le seul cas où je vous recontacte.",
    confirm: "Oui, j'ai vendu",
    alternate: { label: "Oui, et je cherche un autre bien", response: "vendu_cherche" },
    decline: "Non, je n'ai pas vendu",
  },
  stop: {
    eyebrow: EYEBROW,
    title: "Ne plus recevoir de messages ?",
    body: "Confirmez et je retire votre adresse de mes envois. Si c'est une erreur, revenez simplement en arrière.",
    confirm: "Oui, ne plus m'écrire",
    decline: "Non, gardez mon dossier",
  },
};
