import type { FollowupResponse } from "@/lib/buyers/followup-token";

export type FollowupScreen = {
  eyebrow: string;
  title: string;
  body: string;
  primary?: { label: string; href: string; track: string };
  secondary?: { label: string; href: string };
};

const EYEBROW = "Sillage Immo · Suivi de votre projet";

/** Écrans de confirmation, en français (la campagne l'est). `{firstName}` est remplacé. */
export const FOLLOWUP_SCREENS: Record<FollowupResponse, FollowupScreen> = {
  actif: {
    eyebrow: EYEBROW,
    title: "Merci {firstName}, votre projet reste actif.",
    body: "Nous continuons à vous adresser les biens qui correspondent à vos critères, et nous vous appelons dès qu'une visite mérite d'être organisée. Vos critères sont modifiables à tout moment depuis votre espace Sillage.",
    primary: { label: "Ouvrir mon espace Sillage", href: "/espace-client/login", track: "followup_actif_portal" },
    secondary: { label: "Voir les biens à vendre", href: "/vente" },
  },
  visio: {
    eyebrow: EYEBROW,
    title: "Merci {firstName}, nous vous proposons un créneau très vite.",
    body: "Votre demande de point en visio est bien enregistrée : votre conseiller Sillage vous recontacte sous 24 h ouvrées pour fixer un moment qui vous convient. Votre projet reste actif et vos alertes continuent.",
    primary: { label: "Appeler l'agence", href: "tel:+33423450485", track: "followup_visio_call" },
    secondary: { label: "Ouvrir mon espace Sillage", href: "/espace-client/login" },
  },
  modif: {
    eyebrow: EYEBROW,
    title: "Mettez vos critères à jour, {firstName}.",
    body: "Votre projet reste actif. Depuis votre espace Sillage, vous pouvez ajuster budget, secteurs, type de bien, surface et pièces : la sélection que nous vous adressons suit immédiatement.",
    primary: { label: "Ouvrir mon espace Sillage", href: "/espace-client/login", track: "followup_modif_portal" },
  },
  conclu: {
    eyebrow: EYEBROW,
    title: "C'est noté, et bravo pour votre acquisition.",
    body: "Nous cessons nos envois dès maintenant. Si un jour vous souhaitez vendre ou louer ce bien, ou faire estimer sa valeur, nous serons là.",
    primary: { label: "Estimez votre bien", href: "/estimation", track: "followup_conclu_estimate" },
    secondary: { label: "Retour à l'accueil", href: "/" },
  },
  abandon: {
    eyebrow: EYEBROW,
    title: "C'est noté, {firstName}.",
    body: "Nous cessons nos envois dès maintenant. Si votre projet reprend, vous pourrez relancer votre recherche en quelques secondes depuis votre espace Sillage, ou nous écrire.",
    primary: { label: "Retour à l'accueil", href: "/", track: "followup_abandon_home" },
    secondary: { label: "Ouvrir mon espace Sillage", href: "/espace-client/login" },
  },
};

/** Étape de confirmation avant de clore un projet (protège aussi des robots qui suivent les liens des e-mails). */
export const FOLLOWUP_CONFIRM_SCREENS: Record<"conclu" | "abandon", FollowupScreen & { confirm: string; decline: string }> = {
  conclu: {
    eyebrow: EYEBROW,
    title: "Vous avez trouvé ailleurs, {firstName} ?",
    body: "Confirmez et nous arrêtons nos envois. Et si ce n'est pas le cas, dites-nous que votre projet continue : rien ne change.",
    confirm: "Oui, j'ai conclu ailleurs",
    decline: "Non, mon projet continue",
  },
  abandon: {
    eyebrow: EYEBROW,
    title: "Vous abandonnez votre projet, {firstName} ?",
    body: "Confirmez et nous arrêtons nos envois. Vous pourrez reprendre votre recherche plus tard depuis votre espace Sillage. Si c'est une erreur, dites-nous que votre projet continue.",
    confirm: "Oui, j'abandonne pour l'instant",
    decline: "Non, mon projet continue",
  },
};

export const FOLLOWUP_INVALID_SCREEN: FollowupScreen = {
  eyebrow: EYEBROW,
  title: "Ce lien n'est pas valide.",
  body: "Il est peut-être incomplet ou a été modifié. Pour nous dire où en est votre projet, écrivez-nous ou appelez l'agence : nous mettrons votre dossier à jour avec vous.",
  primary: { label: "Nous écrire", href: "mailto:yu@sillage-immo.com", track: "followup_invalid_email" },
  secondary: { label: "Appeler l'agence", href: "tel:+33423450485" },
};

export const personalize = (text: string, firstName: string | null) =>
  firstName ? text.replace("{firstName}", firstName) : text.replace(/,? ?\{firstName\}/g, "");
