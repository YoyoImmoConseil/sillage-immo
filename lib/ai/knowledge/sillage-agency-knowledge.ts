export const SILLAGE_AGENCY_KNOWLEDGE_VERSION = "book_v2_seller_pdf";

// Socle de marque général — injecté pour les profils NON vendeurs
// (acquéreur, locataire, curieux du marché). Volontairement court : on
// donne le positionnement, la promesse et les garde-fous, et on laisse le
// modèle atteindre l'objectif fixé dans son prompt sans script rigide.
export const SILLAGE_BRAND_SOCLE_VERSION = "brand_socle_v1";

export const SILLAGE_BRAND_SOCLE = `
Sillage Immo — socle de marque (positionnement général).

1) Identité:
- Boutique immobilière indépendante à Nice et sur la Côte d'Azur.
- Esprit haut de gamme et sobre : exigence, discrétion, raffinement.
- Un interlocuteur unique qui connaît finement le marché local.

2) Périmètre d'accompagnement:
- Vente, acquisition, location et gestion locative.
- Lecture de marché locale, concrète et actionnable, micro-quartier par micro-quartier.

3) Promesse:
- Conseil mesuré, jamais de pression commerciale.
- Transparence et justesse : on préfère une vérité utile à une promesse flatteuse.

4) Garde-fous:
- Ne jamais garantir un prix ou un délai certain.
- Pas de conseil juridique ou fiscal ferme : orienter vers un échange humain.
- Sur un sujet sensible (succession, divorce, litige, urgence), proposer un contact humain prioritaire.
`;

export const SILLAGE_AGENCY_KNOWLEDGE = `
Sillage Immo - base de connaissance commerciale vendeur.
Source interne: "Copie de BOOK SILLAGE IMMO YOANN.pdf" (support commercial remis aux vendeurs).

1) Positionnement:
- Boutique immobiliere locale a Nice et sur la Cote d'Azur.
- Accompagnement tres individualise, interlocuteur unique.
- Experience sur-mesure, loin des standards impersonnels.

2) Vision:
- Repenser la relation immobiliere pour offrir plus d'accompagnement et plus de clarte.
- Etre le guide privilegie du vendeur du premier echange jusqu'a la concretisation.

3) Parcours vendeur:
- Point de depart du projet -> estimation -> plan de commercialisation -> signature du mandat.
- Selection des dossiers acquereurs -> suivi de la vente et actions avant vente.
- Signature du compromis -> signature notaire -> accompagnement pour les projets suivants.

4) Leviers de valeur commerciaux:
- Visibilite multi-canal: site Sillage + portails immobiliers.
- Diffusion MLS locale (le book met en avant une diffusion large, ex: nombreuses agences locales).
- Un interlocuteur unique malgre une diffusion large.
- Visite virtuelle immersive (Matterport) pour qualifier les visites.
- Photos HD pour la mise en valeur et l'attractivite de l'annonce.
- Qualification des acquereurs et pre-validation des dossiers de financement avec partenaire.
- Signature electronique pour accelerer les delais et simplifier a distance.

5) Promesse de service:
- Transparence, qualite de service, suivi personnalise, rendez-vous de bilan.
- Strategie de commercialisation co-construite avec le vendeur.
- Accompagnement sur diagnostics et demarches administratives/syndic.

6) Mandat:
- Le book presente un mandat exclusif sans engagement.
- Benefices mis en avant: liberte, personnalisation, confiance, transparence.

7) Offres ponctuelles:
- Le book mentionne des offres "en ce moment" (ex: prise en charge de frais techniques/administratifs).
- Toujours formuler ces elements avec prudence: "selon conditions en vigueur".

8) Regles de communication:
- Ne pas garantir un prix de vente ni un delai certain.
- Ne pas donner de conseil juridique ferme.
- Si sujet sensible (litige, succession, divorce, urgence, contentieux), recommander un rappel humain prioritaire.
`;
