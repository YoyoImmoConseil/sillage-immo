## 1.4.0

Espace client + magic link automatiques à la création.

1. Update the create/buyerLead action : à la création d'un lead acquéreur, l'espace client est créé et le mail de connexion (magic link) est envoyé automatiquement. Nouveau champ `sendPortalInvite` (activé par défaut) et sortie `portalEmailSent`.
2. Update the create/sellerLead action : à la création d'un lead vendeur, l'espace client vendeur est provisionné et le mail de connexion (magic link) est envoyé. Nouveau champ `sendPortalInvite` (activé par défaut) et sortie `portalEmailSent`.

L'envoi n'a lieu qu'à la **création** (pas sur les mises à jour) pour éviter les emails en double.

## 1.3.0

Mise à jour des leads acquéreurs (idempotence complète).

1. Update the create/buyerLead action : l'action crée OU met à jour un lead acquéreur existant (par ID externe ou email). La mise à jour modifie les critères du profil de recherche en place (sans créer de doublon de projet) et relance le matching. Ajout du champ de sortie `created`.

## 1.2.0

Rattachement des enregistrements au collaborateur Sillage (assignee SweepBright).

1. Update the create/buyerLead action : ajout des champs Collaborateur (email / ID SweepBright / nom / téléphone).
2. Update the create/sellerLead action : ajout des champs Collaborateur (email / ID SweepBright / nom / téléphone).
3. Update the create/transaction action : ajout des champs Collaborateur + auto-assignation à la création.

L'email du collaborateur est la clé de rattachement la plus fiable. Si aucun
collaborateur ne correspond, l'enregistrement est créé non assigné et les
indices bruts sont conservés pour un rattachement manuel.

## 1.1.0

Ajout de l'ingestion des leads vendeurs et enrichissement des leads acquéreurs.

1. New action! create/sellerLead : ingestion des leads vendeurs avec fusion par email / external_id.
2. Update the create/buyerLead action : exposition de tous les critères de recherche + notes.
3. Update the create/transaction action : ajout du type de mandat et de l'ID bien SweepBright.

## 1.0.0

Version initiale privée : ingestion des transactions, observations de marché et leads acquéreurs vers Sillage Immo.
