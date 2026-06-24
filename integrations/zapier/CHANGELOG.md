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
